/**
 * The packs ship vendored Arduino libraries, and a library that predates the board's core fails only
 * when a learner presses Upload. This compiles a sketch built from each pack's own generator for the
 * ThingBot (ESP32-C3) with the editor's arduino-cli and esp32 core, passing the pack's libs the way the
 * helper does. It skips where no arduino-cli with that core is installed (set THINGBLOCK_ARDUINO_CLI and
 * THINGBLOCK_ARDUINO_CONFIG_DIR to point at one).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { registerGenerators as rgbGenerators } from '../src/extensions/peripheral/rgbLedStrip/generator'
import rgbManifest from '../src/extensions/peripheral/rgbLedStrip/manifest'
import { registerGenerators as servoGenerators } from '../src/extensions/peripheral/servo/generator'
import servoManifest from '../src/extensions/peripheral/servo/manifest'
import type { ArduinoGenerator, ArduinoOrder, PeripheralManifest, RegisterGenerators } from '../src/shared/types'

const ESP32_VERSION = '3.3.11'
const FQBN = 'esp32:esp32:esp32c3:CDCOnBoot=cdc'
const cli = process.env.THINGBLOCK_ARDUINO_CLI ?? '/Applications/ThingBlock.app/Contents/Resources/bin/arduino-cli'
const configDir =
  process.env.THINGBLOCK_ARDUINO_CONFIG_DIR ?? join(homedir(), 'Library/Application Support/ThingBlock')
const available = existsSync(cli) && existsSync(join(configDir, 'data/packages/esp32/hardware/esp32', ESP32_VERSION))

const Order = { ATOMIC: 0, NONE: 99 } as unknown as ArduinoOrder
const PACKS = join(__dirname, '../src/extensions/peripheral')

/**
 * Generate a sketch from one pack's blocks, the way the editor assembles its buckets.
 * @param register The pack's generator registration.
 * @param blocks Opcodes with their input code, in program order (all in setup()).
 * @returns The sketch source.
 */
const sketch = (register: RegisterGenerators, blocks: [string, Record<string, string>][]): string => {
  const gen = {
    forBlock: {} as Record<string, (block: unknown) => string>,
    includes: new Map<string, string>(),
    globals: new Map<string, string>(),
    setups: new Map<string, string>(),
    loopHooks: new Map<string, string>(),
    valueToCode: (block: { values: Record<string, string> }, name: string) => block.values[name] ?? '',
  }
  register(gen as unknown as ArduinoGenerator, Order)
  const body = blocks.map(([op, values]) => gen.forBlock[op]({ values, getFieldValue: () => undefined })).join('')
  return [
    ...gen.includes.values(),
    ...gen.globals.values(),
    `void setup() {\n${[...gen.setups.values()].join('\n')}\n${body}}`,
    `void loop() {\n${[...gen.loopHooks.values()].join('\n')}\n}`,
  ].join('\n\n')
}

const compile = (name: string, source: string, manifest: PeripheralManifest, pack: string) => {
  const dir = join(mkdtempSync(join(tmpdir(), 'tb-pack-')), name)
  mkdirSync(dir)
  writeFileSync(join(dir, `${name}.ino`), source)
  const libs = (manifest.libs ?? []).flatMap((lib) =>
    'path' in lib ? ['--library', join(PACKS, pack, lib.path)] : [],
  )
  // The config's directories are relative to its own folder, as the helper runs it.
  return execFileSync(cli, ['--config-file', 'arduino-cli.yaml', 'compile', '-b', FQBN, ...libs, dir], {
    cwd: configDir,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 600_000,
  })
}

describe.skipIf(!available)('packs compile for the ThingBot with esp32 core ' + ESP32_VERSION, () => {
  it('RGB LED strip', () => {
    const source = sketch(rgbGenerators, [
      ['rgbLedStrip_init', { LEN: '8' }],
      ['rgbLedStrip_setPixelColor', { NO: '1', COLOR: '0xff0000' }],
      ['rgbLedStrip_show', {}],
    ])
    expect(compile('rgb', source, rgbManifest, 'rgbLedStrip')).toMatch(/Sketch uses/)
  }, 600_000)

  it('Servo (GPIO pin)', () => {
    const source = sketch(servoGenerators, [['servo_setangle', { PIN: '4', ANGLE: '90' }]])
    expect(compile('servo', source, servoManifest, 'servo')).toMatch(/Sketch uses/)
  }, 600_000)
})
