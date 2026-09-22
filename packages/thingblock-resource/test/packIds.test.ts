/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import type { PeripheralManifest, RegisterBlocks } from '../src/shared/types'

const manifests = import.meta.glob<{ default: PeripheralManifest }>('../src/extensions/peripheral/*/manifest.ts', {
  eager: true,
})
const blockModules = import.meta.glob<{ registerBlocks: RegisterBlocks }>(
  '../src/extensions/peripheral/*/blocks.ts',
  { eager: true },
)

const packDir = (path: string): string => path.split('/').slice(-2)[0]

/**
 * The sb3 deserializer resolves a saved project's blocks by opcode prefix, so a pack whose id differs
 * from the prefix its blocks use cannot be recognized as pack-owned and fails the load.
 */
describe('peripheral pack ids', () => {
  for (const [path, module] of Object.entries(blockModules)) {
    const dir = packDir(path)
    const manifest = manifests[`../src/extensions/peripheral/${dir}/manifest.ts`].default

    it(`${dir} registers blocks under its own id`, () => {
      const blocks: Record<string, unknown> = {}
      module.registerBlocks({ Blocks: blocks })

      const prefixes = new Set(Object.keys(blocks).map((type) => type.split('_')[0]))
      expect([...prefixes]).toEqual([manifest.id])
    })
  }
})
