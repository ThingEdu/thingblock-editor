import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Only `thingblock-resource/` is shipped (the helper's --resource-root), so every module a pack imports
// has to be emitted inside it. A shared chunk written next to it is missing on a real install and the
// pack's blocks fail to load.
const PACK_ROOT = 'thingblock-resource'
let outDir: string

const jsFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? jsFiles(path) : path.endsWith('.js') ? [path] : []
  })

describe('pack build output', () => {
  beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), 'tb-res-'))
    await build({ configFile: resolve(__dirname, '../vite.config.js'), logLevel: 'silent', build: { outDir } })
  }, 120_000)
  afterAll(() => rmSync(outDir, { recursive: true, force: true }))

  it('emits nothing outside the shipped pack root', () => {
    expect(readdirSync(outDir)).toEqual([PACK_ROOT])
  })

  it('resolves every relative import inside the pack root', () => {
    const root = join(outDir, PACK_ROOT)
    const escaping: string[] = []
    for (const file of jsFiles(root)) {
      const src = readFileSync(file, 'utf8')
      for (const [, spec] of src.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) {
        const target = resolve(dirname(file), spec)
        if (relative(root, target).startsWith('..')) escaping.push(`${relative(root, file)} -> ${spec}`)
      }
    }
    expect(escaping).toEqual([])
  })
})
