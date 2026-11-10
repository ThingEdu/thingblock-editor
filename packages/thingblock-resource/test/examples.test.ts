/// <reference types="vite/client" />
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as BlocklyCore from 'blockly/core'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { ArduinoGenerator } from '../../thingblock-blocks/src/generators/arduino'
import { Order } from '../../thingblock-blocks/src/generators/arduino/order'
import { copyExamples } from '../scripts/copy-examples.mjs'
import { loadHeadlessWorkspace } from '../scripts/examples/headless-workspace.mjs'
import type {
  ArduinoGenerator as PackGenerator,
  DeviceManifest,
  PeripheralManifest,
  RegisterBlocks,
  RegisterGenerators,
} from '../src/shared/types'

interface Example {
  id: string
  file: string
  title: string
  group: string
  level: number
  description: string
  device: string | null
  peripherals: string[]
  hardware: string[]
  source: string
}

interface Sb3Block {
  opcode: string
  fields: Record<string, [string, string | null]>
  inputs: Record<string, unknown[]>
  shadow: boolean
}

interface Project {
  targets: { isStage: boolean; variables: Record<string, [string, unknown]>; blocks: Record<string, Sb3Block> }[]
  extensions: string[]
  board: { device: string; peripherals: string[] }
}

const EXAMPLES_ROOT = join(__dirname, '..', 'src', 'examples')
/** Each device folder and how many examples it ships. */
const FOLDERS: Record<string, number> = { thingbot: 36, cobot: 5 }
const indexOf = (folder: string) =>
  JSON.parse(readFileSync(join(EXAMPLES_ROOT, folder, 'index.json'), 'utf8')) as {
    groups: string[]
    examples: Example[]
  }

const peripheralManifests = import.meta.glob<{ default: PeripheralManifest }>(
  '../src/extensions/peripheral/*/manifest.ts',
  { eager: true },
)
const deviceManifests = import.meta.glob<{ default: DeviceManifest }>('../src/extensions/devices/*/manifest.ts', {
  eager: true,
})
const blockModules = import.meta.glob<{ registerBlocks: RegisterBlocks }>(
  '../src/extensions/peripheral/*/blocks.ts',
  {
    eager: true,
  },
)
const generatorModules = import.meta.glob<{ registerGenerators: RegisterGenerators }>(
  '../src/extensions/peripheral/*/generator.ts',
  { eager: true },
)
const coreBlockSources = import.meta.glob<string>('../../thingblock-blocks/src/blocks/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const packDir = (path: string): string => path.split('/').slice(-2)[0]
const peripheralIds = new Set(Object.values(peripheralManifests).map((m) => m.default.id))
const devices = new Map(Object.values(deviceManifests).map((m) => [m.default.id, m.default]))

interface JsonArgument {
  type?: string
  name?: string
  check?: string | string[]
  options?: string[][]
}

interface JsonConfig {
  args0?: JsonArgument[]
  extensions?: string[]
}

/** Every pack block's JSON config, captured by running its `init` against a recorder. */
const packBlocks = new Map<string, JsonConfig>()
for (const module of Object.values(blockModules)) {
  const Blocks: Record<string, { init(this: unknown): void }> = {}
  module.registerBlocks({ Blocks } as unknown as Parameters<RegisterBlocks>[0])
  for (const [type, definition] of Object.entries(Blocks)) {
    let captured: JsonConfig = {}
    const recorder = new Proxy(
      {},
      {
        get: (_target, key) => (key === 'jsonInit' ? (config: JsonConfig) => (captured = config) : () => undefined),
      },
    )
    definition.init.call(recorder)
    packBlocks.set(type, captured)
  }
}

/** Opcodes the editor defines itself (thingblock-blocks registers each as `Blocks.<opcode> = …`). */
const coreOpcodes = new Set(
  Object.values(coreBlockSources).flatMap((source) => [...source.matchAll(/Blocks\.(\w+)\s*=/g)].map((m) => m[1])),
)

/** Core reporters whose output is not a Number (the rest report numbers). */
const CORE_OUTPUT: Record<string, string> = {
  data_variable: 'String',
  operator_join: 'String',
  operator_letter_of: 'String',
  operator_totext: 'String',
  text: 'String',
  operator_and: 'Boolean',
  operator_contains: 'Boolean',
  operator_equals: 'Boolean',
  operator_gt: 'Boolean',
  operator_lt: 'Boolean',
  operator_not: 'Boolean',
  operator_or: 'Boolean',
}

// The output type of a reporter, as Blockly checks it when connecting.
const outputType = (opcode: string): string => {
  const extensions = packBlocks.get(opcode)?.extensions ?? []
  if (extensions.includes('output_boolean')) return 'Boolean'
  if (extensions.includes('output_string')) return 'String'
  if (extensions.includes('output_number')) return 'Number'
  return CORE_OUTPUT[opcode] ?? 'Number'
}

const loadProjectIn = async (folder: string, file: string): Promise<Project> => {
  const zip = await JSZip.loadAsync(readFileSync(join(EXAMPLES_ROOT, folder, file)))
  const json = zip.file('project.json')
  if (!json) throw new Error(`${file}: no project.json`)
  return JSON.parse(await json.async('string')) as Project
}

describe.each(Object.entries(FOLDERS))('bundled %s examples', (folder, count) => {
  const index = indexOf(folder)
  const loadProject = (file: string) => loadProjectIn(folder, file)

  it(`lists ${count} examples with unique ids, each with a file and a known group`, () => {
    expect(index.examples).toHaveLength(count)
    expect(new Set(index.examples.map((e) => e.id)).size).toBe(count)
    for (const example of index.examples) {
      expect(index.groups).toContain(example.group)
      expect(example.device).toBe(folder)
      expect(existsSync(join(EXAMPLES_ROOT, folder, example.file))).toBe(true)
    }
    const files = readdirSync(join(EXAMPLES_ROOT, folder)).filter((f) => f.endsWith('.tb'))
    expect(files.sort()).toEqual(index.examples.map((e) => e.file).sort())
  })

  for (const example of index.examples) {
    describe(example.id, () => {
      it('targets a known device with real peripherals, matching its index entry', async () => {
        const project = await loadProject(example.file)
        const device = devices.get(project.board.device)
        expect(device).toBeDefined()
        expect(project.board.device).toBe(example.device)
        expect(project.board.peripherals).toEqual(example.peripherals)
        for (const id of [...project.board.peripherals, ...project.extensions]) expect(peripheralIds).toContain(id)
        // Every pack a block comes from is active: provided by the device or saved in `board`.
        const active = new Set([...(device?.extensions ?? []), ...project.board.peripherals])
        for (const id of project.extensions) expect(active).toContain(id)
      })

      it('uses only registered blocks, with real field names and dropdown values', async () => {
        const project = await loadProject(example.file)
        const blocks = Object.assign({}, ...project.targets.map((t) => t.blocks)) as Record<string, Sb3Block>
        for (const block of Object.values(blocks)) {
          const config = packBlocks.get(block.opcode)
          if (!config) {
            expect(coreOpcodes, `${block.opcode} is not a registered block`).toContain(block.opcode)
            continue
          }
          const args = config.args0 ?? []
          for (const [name, [value]] of Object.entries(block.fields)) {
            const arg = args.find((a) => a.name === name)
            expect(arg, `${block.opcode} has no field ${name}`).toBeDefined()
            if (arg?.options) expect(arg.options.map((o) => o[1])).toContain(value)
          }
          // The editor refuses a reporter whose output does not match the input's check, so the block
          // would load detached.
          for (const [name, input] of Object.entries(block.inputs)) {
            const check = args.find((a) => a.name === name)?.check
            if (!check) continue
            const ref = input[1]
            const type = Array.isArray(ref)
              ? ref[0] === 12
                ? 'String'
                : 'Number'
              : outputType(blocks[ref as string].opcode)
            expect([check].flat(), `${block.opcode}.${name} holds a ${type} reporter`).toContain(type)
          }
        }
      })

      it('generates an Arduino sketch with the real generators', async () => {
        const project = await loadProject(example.file)
        const device = devices.get(project.board.device)
        const generator = new ArduinoGenerator()
        for (const id of [...(device?.extensions ?? []), ...project.board.peripherals]) {
          const path = Object.keys(peripheralManifests).find((p) => peripheralManifests[p].default.id === id)
          const register = generatorModules[`../src/extensions/peripheral/${packDir(path ?? '')}/generator.ts`]
          register.registerGenerators(generator as unknown as PackGenerator, Order)
        }
        const code = generator.workspaceToCode(loadHeadlessWorkspace(BlocklyCore, project))
        expect(code).toContain('void setup()')
        expect(code).toContain('void loop()')
        // A block without a generator would surface as Blockly's "undefined" placeholder.
        expect(code).not.toMatch(/\bundefined\b/)
      })
    })
  }
})

describe('served examples', () => {
  it('copies every example into the served pack with one merged index', () => {
    const out = mkdtempSync(join(tmpdir(), 'examples-out-'))
    const merged = copyExamples(EXAMPLES_ROOT, out)
    // The ThingBot and CoBot examples, and the boardless Camera AI ones, each under its own folder.
    expect(merged.examples).toHaveLength(36 + 5 + 11)
    expect(merged.groups).toContain('CoBot')
    expect(merged.groups).toContain('Camera AI')
    for (const example of merged.examples as Example[]) {
      expect(example.file.startsWith(`${example.device ?? 'camera-ai'}/`)).toBe(true)
      expect(existsSync(join(out, example.file))).toBe(true)
    }
    expect(JSON.parse(readFileSync(join(out, 'index.json'), 'utf8'))).toEqual(merged)
  })
})
