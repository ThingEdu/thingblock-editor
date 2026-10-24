// Imports scratch-blocks source, whose `Order` enum is not erasable syntax, so the package's tsc skips this file and vitest (esbuild) is its only type pass.
/**
 * Every shipped lesson proves itself: its `kiem-thu/dung*.tb` passes each graded step and each
 * `sai-<n>.tb` fails step n, graded exactly as the editor grades a learner (5 s of virtual time).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as Blockly from 'blockly/core'
import JSZip from 'jszip'
import { beforeEach, describe, expect, it } from 'vitest'
import { Order } from '../../../scratch-blocks/src/generators/arduino/order'
import { SimGenerator } from '../../../scratch-blocks/src/generators/sim'
import { createBoard } from '../../../thingblock-sim/src/board'
import { evaluateLogRules } from '../../../thingblock-sim/src/checker/evaluate'
import { compileProgram, loadProject, type Sb3Project } from '../../../thingblock-sim/src/headless'
import { Runner } from '../../../thingblock-sim/src/runtime'
import { parseLesson } from '../../scripts/lessons/parse-lesson.mjs'
import { registerSimGenerators as registerOled } from '../../src/extensions/peripheral/oled/sim'
import { registerSimGenerators as registerThingBot } from '../../src/extensions/peripheral/thingbot-core/sim'

const TUTORIALS = join(__dirname, '../../src/tutorials')
const WINDOW_US = 5_000_000

let generator: SimGenerator
beforeEach(() => {
  generator = new SimGenerator()
  registerThingBot(generator as never, Order)
  registerOled(generator as never, Order)
})

const readTb = async (path: string): Promise<Sb3Project> => {
  const zip = await JSZip.loadAsync(readFileSync(path))
  const entry = zip.file('project.json')
  if (!entry) throw new Error(`${path} thiếu project.json`)
  return JSON.parse(await entry.async('string')) as Sb3Project
}

type Rules = Parameters<typeof evaluateLogRules>[0]

const grade = async (tb: string, rules: Rules) => {
  const workspace = loadProject(Blockly, await readTb(tb))
  const code = generator.workspaceToCode(workspace)
  workspace.dispose()
  expect(generator.diagnostics, `${tb} dùng khối chưa mô phỏng`).toEqual([])
  const board = createBoard()
  const runner = new Runner(compileProgram<typeof board.$>(code)(board.$), board.clock, board.log)
  runner.runUntil(WINDOW_US)
  return evaluateLogRules(rules, board.log.entries)
}

const lessonDirs = readdirSync(TUTORIALS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

describe.each(lessonDirs)('lesson %s', (ma) => {
  const dir = join(TUTORIALS, ma)
  const files = readdirSync(dir)
  const { lesson } = parseLesson(readFileSync(join(dir, 'bai.vi.md'), 'utf8'), { dirName: ma, lang: 'vi', files })
  const graded = lesson.steps.map((s, i) => ({ step: s, n: i + 1 })).filter(({ step }) => step.rules.length)
  const rulesOf = (n: number): Rules => {
    const found = graded.find((g) => g.n === n)
    if (!found) throw new Error(`bước ${n} không có luật`)
    return found.step.rules
  }
  const fixture = (name: string) => join(dir, 'kiem-thu', name)

  it('has at least one graded step and a correct solution', () => {
    expect(graded.length).toBeGreaterThan(0)
    expect(existsSync(fixture('dung.tb')) || graded.every(({ n }) => existsSync(fixture(`dung-${n}.tb`)))).toBe(true)
  })

  it.each(graded.map(({ n }) => n))('step %i passes with the correct solution', async (n) => {
    const tb = existsSync(fixture(`dung-${n}.tb`)) ? fixture(`dung-${n}.tb`) : fixture('dung.tb')
    const results = await grade(tb, rulesOf(n))
    expect(results.map((r) => r.message)).toEqual(results.map(() => ''))
  })

  it.each(graded.map(({ n }) => n))('step %i fails with its sai-<n>.tb and explains why', async (n) => {
    const tb = fixture(`sai-${n}.tb`)
    expect(existsSync(tb), `thiếu ${tb}`).toBe(true)
    const results = await grade(tb, rulesOf(n))
    expect(results.some((r) => !r.ok)).toBe(true)
    for (const r of results.filter((r) => !r.ok)) expect(r.message).not.toBe('')
  })
})
