/**
 * Build and run a generated Arduino sketch on the host, against the real Adafruit libraries and the
 * ESP32 core's Print/String sources, with `host/` standing in for the hardware. The run prints the
 * same event log the simulator records, so a test can run one project both ways and compare.
 *
 * The ESP32 core sources are read from an installed core (the one ThingBlock's helper installs); set
 * `THINGBLOCK_ESP32_CORE` to point elsewhere. `coreDir()` returns null when none is found, and the
 * parity tests skip.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { LogEntry } from '../src/runtime'

const HERE = dirname(fileURLToPath(import.meta.url))
const HOST = join(HERE, 'host')
const PACKS = join(HERE, '..', '..', 'thingblock-resource', 'src', 'extensions', 'peripheral')
const ESP32_VERSION = '3.3.11'

/** Library sources the ThingBot and OLED packs vendor, compiled into every parity build. */
const LIBRARIES = [
  join(PACKS, 'thingbot-core/libs/Adafruit_BusIO'),
  join(PACKS, 'thingbot-core/libs/Adafruit_PWM_Servo_Driver_Library'),
  join(PACKS, 'oled/libs/Adafruit_GFX_Library'),
  join(PACKS, 'oled/libs/Adafruit_SSD1306'),
]
const LIBRARY_SOURCES = [
  'Adafruit_BusIO/Adafruit_I2CDevice.cpp',
  'Adafruit_PWM_Servo_Driver_Library/Adafruit_PWMServoDriver.cpp',
  'Adafruit_GFX_Library/Adafruit_GFX.cpp',
  'Adafruit_GFX_Library/glcdfont.c',
  'Adafruit_SSD1306/Adafruit_SSD1306.cpp',
]
const CORE_SOURCES = ['Print.cpp', 'WString.cpp', 'stdlib_noniso.c']

export function coreDir(): string | null {
  const candidates = [
    process.env.THINGBLOCK_ESP32_CORE,
    join(
      homedir(),
      'Library/Application Support/ThingBlock/data/packages/esp32/hardware/esp32',
      ESP32_VERSION,
      'cores/esp32',
    ),
    join(homedir(), '.arduino15/packages/esp32/hardware/esp32', ESP32_VERSION, 'cores/esp32'),
  ]
  return candidates.find((dir): dir is string => !!dir && existsSync(join(dir, 'Print.cpp'))) ?? null
}

/**
 * Prepend what arduino-cli's preprocessor adds to a `.ino`: the Arduino.h include and a prototype for
 * every function, placed after the includes so a function can be called above its definition.
 * @param sketch The generated sketch.
 * @returns A translation unit a plain C++ compiler accepts.
 */
export function preprocessSketch(sketch: string): string {
  const lines = sketch.split('\n')
  let lastInclude = -1
  lines.forEach((line, i) => {
    if (/^\s*#include/.test(line)) lastInclude = i
  })
  const prototypes: string[] = []
  const definition = /^(?!if\b|for\b|while\b|switch\b|class\b|struct\b|else\b)([A-Za-z_][\w<>:*&\s]*?[\s*&])([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*\{\s*$/
  for (const line of lines) {
    const match = definition.exec(line)
    if (match && match[2] !== 'setup' && match[2] !== 'loop') prototypes.push(`${match[1].trim()} ${match[2]}(${match[3]});`)
  }
  const head = lines.slice(0, lastInclude + 1)
  const rest = lines.slice(lastInclude + 1)
  return ['#include <Arduino.h>', ...head, ...prototypes, ...rest].join('\n')
}

/**
 * Compile `sketch` with the host stand-ins and run it for `ms` of virtual time.
 * @param sketch The Arduino generator's output.
 * @param ms Virtual run time in milliseconds.
 * @param inputs Inputs to apply at given virtual times (µs), e.g. a button press.
 * @returns The event log the run printed.
 */
export function runSketch(sketch: string, ms: number, inputs: { t: number; key: string; value: number }[] = []): LogEntry[] {
  const core = coreDir()
  if (!core) throw new Error('runSketch: no ESP32 core found; set THINGBLOCK_ESP32_CORE')
  const source = preprocessSketch(sketch)
  const id = createHash('sha256').update(source).digest('hex').slice(0, 16)
  const work = join(tmpdir(), 'thingblock-parity')
  mkdirSync(work, { recursive: true })

  const includes = [HOST, core, ...LIBRARIES].flatMap((dir) => ['-I', dir])
  const flags = ['-O1', '-w', '-DARDUINO=10819', '-DESP32', ...includes]
  const objects = buildObjects(work, core, flags)

  const sketchFile = join(work, `${id}.cpp`)
  const binary = join(work, id)
  writeFileSync(sketchFile, source)
  execFileSync('c++', ['-std=gnu++17', ...flags, sketchFile, ...objects, '-o', binary], { stdio: 'pipe' })

  const args = [String(ms)]
  if (inputs.length > 0) {
    const inputFile = join(work, `${id}.inputs`)
    writeFileSync(inputFile, inputs.map((i) => `${i.t} ${i.key} ${i.value}`).join('\n'))
    args.push(inputFile)
  }
  const output = execFileSync(binary, args, { encoding: 'utf8', timeout: 20_000 })
  return output
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LogEntry)
}

/** Compile the core, library and host sources once per content, reusing objects across runs. */
function buildObjects(work: string, core: string, flags: string[]): string[] {
  // The core sources include "Arduino.h" in quotes, which would find the real core header beside
  // them; copied out of the core directory they find the host stand-in on the include path instead.
  const coreCopies = CORE_SOURCES.map((file) => {
    const copy = join(work, `core_${file}`)
    copyFileSync(join(core, file), copy)
    return copy
  })
  const sources = [
    join(HOST, 'sim_host.cpp'),
    ...coreCopies,
    ...LIBRARY_SOURCES.map((file) => join(PACKS, file.startsWith('Adafruit_BusIO') || file.startsWith('Adafruit_PWM') ? 'thingbot-core/libs' : 'oled/libs', file)),
  ]
  const stamp = createHash('sha256')
    .update(JSON.stringify(flags))
    .update(readdirSync(HOST).join())
    .digest('hex')
    .slice(0, 8)
  return sources.map((file) => {
    const object = join(work, `${file.replace(/[/\\ ]/g, '_')}.${stamp}.o`)
    if (!existsSync(object) || file.startsWith(HOST)) {
      const c = file.endsWith('.c')
      execFileSync(c ? 'cc' : 'c++', [c ? '-std=gnu11' : '-std=gnu++17', ...flags, '-c', file, '-o', object], {
        stdio: 'pipe',
      })
    }
    return object
  })
}
