// Generate the Arduino sketch of every bundled example with ThingBlock's real generators, then compile
// it with arduino-cli for the example's device. Run by hand (it needs arduino-cli and the ESP32 core):
//
//   npx tsx scripts/check-examples.mjs [--out <dir>] [--only <id>] [--no-compile]
//
// Environment: ARDUINO_CLI (default: arduino-cli on PATH), ARDUINO_DIRECTORIES_DATA (the ESP32 core,
// e.g. ~/Library/Application Support/ThingBlock/data). The script imports TypeScript sources, so it
// runs under tsx, not plain node.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as BlocklyNs from 'blockly/core'
import { ArduinoGenerator } from '../../thingblock-blocks/src/generators/arduino.ts'
import { Order } from '../../thingblock-blocks/src/generators/arduino/order.ts'
import { loadHeadlessWorkspace } from './examples/headless-workspace.mjs'

const require = createRequire(import.meta.url)
const JSZip = require('jszip')
const Blockly = BlocklyNs.default ?? BlocklyNs

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const EXAMPLES = join(ROOT, 'src', 'examples')
const PERIPHERALS = join(ROOT, 'src', 'extensions', 'peripheral')
const DEVICES = join(ROOT, 'src', 'extensions', 'devices')

const args = process.argv.slice(2)
const option = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const outDir = option('--out') ?? mkdtempSync(join(tmpdir(), 'tb-examples-'))
const only = option('--only')
const compile = !args.includes('--no-compile')
const cli = process.env.ARDUINO_CLI ?? 'arduino-cli'

// Peripheral packs by manifest id (the opcode prefix), each with its generators and vendored libs.
const packs = new Map()
for (const dir of readdirSync(PERIPHERALS)) {
  const { default: manifest } = await import(join(PERIPHERALS, dir, 'manifest.ts'))
  const generatorFile = join(PERIPHERALS, dir, 'generator.ts')
  const generator = existsSync(generatorFile) ? await import(generatorFile) : null
  const libsDir = join(PERIPHERALS, dir, 'libs')
  const libs = existsSync(libsDir) ? readdirSync(libsDir).map((name) => join(libsDir, name)) : []
  packs.set(manifest.id, { register: generator?.registerGenerators, libs })
}

const devices = new Map()
for (const dir of readdirSync(DEVICES)) {
  const { default: manifest } = await import(join(DEVICES, dir, 'manifest.ts'))
  devices.set(manifest.id, manifest)
}

const results = []
for (const deviceDir of readdirSync(EXAMPLES)) {
  const index = JSON.parse(readFileSync(join(EXAMPLES, deviceDir, 'index.json'), 'utf8'))
  for (const example of index.examples) {
    if (only && example.id !== only) continue
    const zip = await JSZip.loadAsync(readFileSync(join(EXAMPLES, deviceDir, example.file)))
    const project = JSON.parse(await zip.file('project.json').async('string'))
    // A boardless example (Camera AI) runs in the editor and has no sketch to compile.
    if (!project.board) continue
    const device = devices.get(project.board.device)
    const active = [...new Set([...device.extensions, ...project.board.peripherals])]

    const generator = new ArduinoGenerator()
    for (const id of active) packs.get(id).register?.(generator, Order)
    const code = generator.workspaceToCode(loadHeadlessWorkspace(Blockly, project))

    const sketchDir = join(outDir, example.id)
    mkdirSync(sketchDir, { recursive: true })
    const sketch = join(sketchDir, `${example.id}.ino`)
    writeFileSync(sketch, code)

    let status = 'generated'
    if (compile) {
      // The first pack to vendor a library wins, matching one copy per library name on the include path.
      const libraries = new Map()
      for (const id of active) {
        for (const lib of packs.get(id).libs)
          if (!libraries.has(lib.split('/').pop())) libraries.set(lib.split('/').pop(), lib)
      }
      const options = Object.entries(device.compile?.options ?? {})
        .map(([key, value]) => `${key}=${value}`)
        .join(',')
      const fqbn = options ? `${device.fqbn}:${options}` : device.fqbn
      const cliArgs = ['compile', '--fqbn', fqbn, ...[...libraries.values()].flatMap((lib) => ['--library', lib])]
      try {
        execFileSync(cli, [...cliArgs, sketchDir], { stdio: 'pipe', encoding: 'utf8' })
        status = 'ok'
      } catch (error) {
        status = 'FAIL'
        writeFileSync(join(sketchDir, 'compile-error.txt'), `${error.stdout ?? ''}\n${error.stderr ?? ''}`)
      }
    }
    results.push({ id: example.id, status })
    console.log(`${status.padEnd(9)} ${example.id}`)
  }
}

const failed = results.filter((r) => r.status === 'FAIL')
console.log(`\n${results.length - failed.length}/${results.length} passed; sketches in ${outDir}`)
if (failed.length) process.exit(1)
