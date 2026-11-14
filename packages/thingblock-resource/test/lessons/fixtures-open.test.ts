/**
 * A teacher opens a lesson's reference solutions in the editor, so every `solutions/*.tb` must be a
 * project the editor accepts: it passes the same scratch-parser validation the editor runs, every
 * target has a costume, and it names its board (none for Camera AI) and the packs its blocks need, like an
 * editor save.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
// The editor's own project validator (a dependency of thingblock-vm).
const parseProject = require('scratch-parser') as (
  input: Buffer,
  isSprite: boolean,
  callback: (error: unknown, project: unknown) => void,
) => void

const TUTORIALS = join(__dirname, '../../src/tutorials')
const fixtures = readdirSync(TUTORIALS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => {
    const dir = join(TUTORIALS, d.name, 'solutions')
    try {
      return readdirSync(dir)
        .filter((f) => f.endsWith('.tb'))
        .map((f) => join(dir, f))
    } catch {
      return []
    }
  })

interface Project {
  targets: { isStage: boolean; costumes: unknown[]; blocks: Record<string, { opcode: string }> }[]
  extensions?: string[]
  board?: { device: string; peripherals: string[] }
}

describe.each(fixtures.map((f) => [f.slice(TUTORIALS.length + 1), f]))('%s', (_name, file) => {
  it('passes the editor’s project validation', async () => {
    const error = await new Promise((resolve) => {
      parseProject(readFileSync(file), false, (e) => resolve(e))
    })
    expect(error).toBeNull()
  })
  it('has a costume on every target and names its board and packs', async () => {
    const zip = await JSZip.loadAsync(readFileSync(file))
    const entry = zip.file('project.json')
    if (!entry) throw new Error(`${file} has no project.json`)
    const project = JSON.parse(await entry.async('string')) as Project
    for (const target of project.targets) expect(target.costumes.length).toBeGreaterThan(0)
    const opcodes = project.targets.flatMap((t) => Object.values(t.blocks).map((b) => b.opcode))
    // Camera AI runs without a board, so its solutions save none and name the extension instead.
    if (opcodes.some((o) => o.startsWith('cameraAi_'))) {
      expect(project.board).toBeUndefined()
      expect(project.extensions).toEqual(['cameraAi'])
    } else {
      expect(project.board?.device).toBe('thingbot')
    }
    if (opcodes.some((o) => o.startsWith('oled_'))) {
      expect(project.extensions).toContain('oled')
      expect(project.board?.peripherals).toContain('oled')
    }
    if (opcodes.some((o) => o.startsWith('thingBotC3_'))) expect(project.extensions).toContain('thingBotC3')
  })
})
