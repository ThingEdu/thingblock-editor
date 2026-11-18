/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import type { Blockly, RegisterBlocks } from '../src/shared/types'

const blockModules = import.meta.glob<{ registerBlocks: RegisterBlocks }>(
  '../src/extensions/peripheral/*/blocks.ts',
  { eager: true },
)
const toolboxes = import.meta.glob<{ default: { contents: { kind: string; type?: string }[] } }>(
  '../src/extensions/peripheral/*/toolbox.ts',
  { eager: true },
)

const packDir = (path: string): string => path.split('/').slice(-2)[0]

describe('peripheral pack toolboxes', () => {
  for (const [path, module] of Object.entries(blockModules)) {
    const dir = packDir(path)

    it(`${dir} offers every block it registers, and nothing else`, () => {
      const Blocks: Record<string, unknown> = {}
      module.registerBlocks({ Blocks } as unknown as Blockly)
      const toolbox = toolboxes[`../src/extensions/peripheral/${dir}/toolbox.ts`].default
      const offered = toolbox.contents.filter((item) => item.kind === 'block').map((item) => item.type)
      expect(offered.sort()).toEqual(Object.keys(Blocks).sort())
    })
  }
})
