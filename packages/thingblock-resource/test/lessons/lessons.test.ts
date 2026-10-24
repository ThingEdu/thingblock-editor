// Imports scratch-blocks source, whose `Order` enum is not erasable syntax, so the package's tsc excludes this
// file; it only runs under vitest, which strips types without checking them.
/**
 * Every shipped lesson proves itself: its `kiem-thu/dung*.tb` passes each graded step and each
 * `sai-<n>.tb` fails step n, graded as the editor grades a learner: the rules are checked after every
 * simulator tick, and the step passes if they all hold at any tick within 5 s of virtual time.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as Blockly from 'blockly/core'
import JSZip from 'jszip'
import { beforeEach, describe, expect, it } from 'vitest'
import { Order } from '../../../scratch-blocks/src/generators/arduino/order'
import { SimGenerator } from '../../../scratch-blocks/src/generators/sim'
import type { RuleResult } from '../../../thingblock-sim/src/checker/evaluate'
import type { Rule } from '../../../thingblock-sim/src/checker/rules'
import { Watcher, type CheckReport } from '../../../thingblock-sim/src/checker/watch'
import { loadProject, type Sb3Project } from '../../../thingblock-sim/src/headless'
import { Session } from '../../../thingblock-sim/src/session'
import { parseLesson } from '../../scripts/lessons/parse-lesson.mjs'
import { registerSimGenerators as registerOled } from '../../src/extensions/peripheral/oled/sim'
import { registerSimGenerators as registerThingBot } from '../../src/extensions/peripheral/thingbot-core/sim'

const TUTORIALS = join(__dirname, '../../src/tutorials')
const WINDOW_US = 5_000_000
/** The worker's tick, in milliseconds. */
const TICK_MS = 16

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

/**
 * Run `tb` the way the editor's worker does and report whether some tick satisfied every rule.
 * @param tb Path to the project.
 * @param rules The step's rules.
 * @returns `passed`, and the results of the worker's last `check` (what the verdict box shows).
 */
const grade = async (tb: string, rules: Rule[]): Promise<{ passed: boolean; results: RuleResult[] }> => {
  const workspace = loadProject(Blockly, await readTb(tb))
  const code = generator.workspaceToCode(workspace)
  workspace.dispose()
  expect(generator.diagnostics, `${tb} dùng khối chưa mô phỏng`).toEqual([])
  // A fixed clock keeps every tick within its real-time budget, so each one advances the full 16 ms.
  const session = new Session(code, { now: () => 0 })
  const watcher = new Watcher()
  watcher.set(rules)
  const allOk = (r: CheckReport | null) => r?.results.every((x) => x.ok) ?? false
  let report: CheckReport | null = null
  session.running = true
  for (let t = 0; t < WINDOW_US && !allOk(report); ) {
    const snapshot = session.tick(TICK_MS)
    report = watcher.after(session) ?? report
    if (snapshot.phase === 'halted') break
    t = snapshot.t
  }
  if (!report) throw new Error(`${tb}: không có kết quả chấm`)
  return { passed: allOk(report), results: report.results }
}

const lessonDirs = readdirSync(TUTORIALS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

describe.each(lessonDirs)('lesson %s', (ma) => {
  const dir = join(TUTORIALS, ma)
  const files = readdirSync(dir)
  const { lesson } = parseLesson(readFileSync(join(dir, 'bai.vi.md'), 'utf8'), { dirName: ma, lang: 'vi', files })
  const graded = lesson.steps.map((s, i) => ({ step: s, n: i + 1 })).filter(({ step }) => step.rules.length)
  const rulesOf = (n: number): Rule[] => {
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
    const { results } = await grade(tb, rulesOf(n))
    expect(results.map((r) => r.message)).toEqual(results.map(() => ''))
  })

  it.each(graded.map(({ n }) => n))('step %i fails with its sai-<n>.tb and explains why', async (n) => {
    const tb = fixture(`sai-${n}.tb`)
    expect(existsSync(tb), `thiếu ${tb}`).toBe(true)
    const { passed, results } = await grade(tb, rulesOf(n))
    expect(passed).toBe(false)
    for (const r of results.filter((r) => !r.ok)) expect(r.message).not.toBe('')
  })
})
