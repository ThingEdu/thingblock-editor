/// <reference types="vite/client" />
/**
 * Pack blocks follow the editor's language (#40): each pack's `locales/vi.json` must name real blocks,
 * keep every `%n` input, and only relabel dropdown values that exist; and a block created while the
 * blocks locale is Vietnamese shows the Vietnamese text with unchanged values.
 */
import { describe, expect, it } from 'vitest'
import { translateJson, type BlockTranslation } from '../src/shared/localize'
import type { Blockly, RegisterBlocks } from '../src/shared/types'

const packs = import.meta.glob<{ registerBlocks: RegisterBlocks }>('../src/extensions/peripheral/*/blocks.ts', {
  eager: true,
})
const locales = import.meta.glob<{ default: Record<string, BlockTranslation> }>(
  '../src/extensions/peripheral/*/locales/vi.json',
  { eager: true },
)
const packOf = (path: string) => path.split('/peripheral/')[1].split('/')[0]

interface Json {
  message0?: string
  tooltip?: string
  args0?: { name?: string; options?: [string, string][] }[]
}

/**
 * Register a pack on a stand-in Blockly whose blocks locale is `locale`, and read each block's JSON.
 * @param register The pack's registration.
 * @param locale The language the editor shows blocks in, e.g. `vi`.
 * @returns Each block's JSON definition by opcode.
 */
const blocksIn = (register: RegisterBlocks, locale: string): Record<string, Json> => {
  const Blocks: Record<string, { init?: (this: unknown) => void }> = {}
  const target: Record<string, unknown> = { Blocks, ScratchMsgs: { currentLocale_: locale } }
  register(
    new Proxy(target, {
      get: (t, key: string): unknown => (key in t ? t[key] : new Proxy(() => undefined, { get: () => undefined })),
    }) as unknown as Blockly,
  )
  const out: Record<string, Json> = {}
  for (const [opcode, def] of Object.entries(Blocks)) {
    const self: Record<string, unknown> = {}
    // The block's prototype method, which the translation wrapper shadows and then restores.
    Object.setPrototypeOf(self, {
      jsonInit: (j: Json) => {
        out[opcode] = j
      },
    })
    try {
      def.init?.call(new Proxy(self, { get: (t, k: string) => (k in t ? t[k] : () => undefined) }))
    } catch {
      // Imperatively built blocks are not translated through JSON.
    }
  }
  return out
}

const placeholders = (text = '') => [...text.matchAll(/%\d+/g)].map((m) => m[0]).sort()

describe.each(Object.entries(locales).map(([path, mod]) => [packOf(path), mod.default]))('%s vi.json', (pack, vi) => {
  const found = Object.entries(packs).find(([path]) => packOf(path) === pack)
  if (!found) throw new Error(`no blocks.ts for ${pack}`)
  const register = found[1].registerBlocks
  it('translates real blocks, keeping their inputs and dropdown values', () => {
    const en = blocksIn(register, 'en')
    for (const [opcode, tr] of Object.entries(vi)) {
      const json = en[opcode] as Json | undefined
      expect(json, `${opcode} is not a block of ${pack}`).toBeDefined()
      if (!json) continue
      if (tr.message0) expect(placeholders(tr.message0), opcode).toEqual(placeholders(json.message0))
      for (const [field, labels] of Object.entries(tr.options ?? {})) {
        const values = json.args0?.find((a) => a.name === field)?.options?.map((o) => o[1]) ?? []
        for (const value of Object.keys(labels)) expect(values, `${opcode}.${field}`).toContain(value)
      }
    }
  })
  it('covers every block of the pack', () => {
    expect(Object.keys(blocksIn(register, 'en')).filter((op) => !(op in vi))).toEqual([])
  })
})

it('a block created in Vietnamese shows Vietnamese text and keeps its values', () => {
  const found = Object.entries(packs).find(([path]) => packOf(path) === 'thingbot-core')
  if (!found) throw new Error('no thingbot-core blocks')
  const register = found[1].registerBlocks
  const vi = blocksIn(register, 'vi').thingBotC3_setMotor
  const en = blocksIn(register, 'en').thingBotC3_setMotor
  expect(en.message0).toBe('set motor %1 go %2 at %3')
  expect(vi.message0).toBe('động cơ %1 chạy %2 tốc độ %3%%') // Blockly shows %% as a literal %
  expect(vi.args0?.find((a) => a.name === 'DIRECTION')?.options).toEqual([
    ['tiến', 'forward'],
    ['lùi', 'backward'],
  ])
})

it('ignores a translation that would drop an input', () => {
  const json = { message0: 'set %1 to %2', args0: [] }
  expect(translateJson(json, { message0: 'đặt %1' }).message0).toBe('set %1 to %2')
})
