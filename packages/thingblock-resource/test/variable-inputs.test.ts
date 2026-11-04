/// <reference types="vite/client" />
/**
 * A variable reporter's output is typed String in scratch-blocks, so a value input that checks for
 * 'Number' alone refuses `motor M1 speed (tocDo)`. Every pack's number inputs must take variables too.
 */
import { describe, expect, it } from 'vitest'
import type { Blockly, RegisterBlocks } from '../src/shared/types'

const packs = import.meta.glob<{ registerBlocks: RegisterBlocks }>('../src/extensions/peripheral/*/blocks.ts', {
  eager: true,
})

interface Arg {
  type: string
  name?: string
  check?: string | string[]
}
type Json = Record<string, unknown>

/**
 * Every `input_value` argument of every block a pack defines.
 * @param register The pack's block registration.
 * @returns `opcode.INPUT` with its connection check (null when it takes anything).
 */
const valueInputs = (register: RegisterBlocks): [string, string[] | null][] => {
  const Blocks: Record<string, { init?: (this: unknown) => void }> = {}
  // Packs only touch `Blockly.Blocks` while registering; anything else reads as a no-op.
  const target: Record<string, unknown> = { Blocks }
  const fakeBlockly = new Proxy(target, {
    get: (t, key: string): unknown => (key in t ? t[key] : new Proxy(() => undefined, { get: () => undefined })),
  })
  register(fakeBlockly as unknown as Blockly)
  const found: [string, string[] | null][] = []
  for (const [opcode, def] of Object.entries(Blocks)) {
    let json: Json | undefined
    try {
      def.init?.call(
        new Proxy(
          { jsonInit: (j: Json) => (json = j) },
          { get: (t, k: string) => (k in t ? t[k as keyof typeof t] : () => undefined) },
        ),
      )
    } catch {
      // Blocks built imperatively (not through jsonInit) have nothing to check here.
    }
    if (!json) continue
    for (const [key, value] of Object.entries(json)) {
      if (!key.startsWith('args') || !Array.isArray(value)) continue
      for (const arg of value as Arg[]) {
        if (arg.type !== 'input_value') continue
        const check = arg.check === undefined ? null : ([] as string[]).concat(arg.check)
        found.push([`${opcode}.${arg.name}`, check])
      }
    }
  }
  return found
}

describe.each(Object.entries(packs).map(([path, mod]) => [path.split('/').at(-2), mod.registerBlocks]))(
  '%s',
  (_pack, register) => {
    it('number inputs also accept variable reporters', () => {
      const refused = valueInputs(register).filter(
        ([, check]) => check?.includes('Number') && !check.includes('String'),
      )
      expect(refused.map(([input]) => input)).toEqual([])
    })
  },
)
