/// <reference types="vite/client" />
// Imports scratch-blocks source, whose `Order` enum is not erasable syntax, so the package's tsc excludes this
// file; it only runs under vitest, which strips types without checking them.
/**
 * Every shipped lesson proves itself: its `solutions/pass*.tb` passes each graded step and each
 * `fail-<n>.tb` fails step n, graded as the editor grades a learner: the rules are checked after every
 * simulator tick, and the step passes if they all hold at any tick within 5 s of virtual time. A step
 * with input rules runs with the rig set the way the step tells the learner to set it.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as Blockly from 'blockly/core'
import JSZip from 'jszip'
import { beforeEach, describe, expect, it } from 'vitest'
import { Order } from '../../../thingblock-blocks/src/generators/arduino/order'
import { SimGenerator } from '../../../thingblock-blocks/src/generators/sim'
import type { RuleResult } from '../../../thingblock-sim/src/checker/evaluate'
import { inputsFor } from '../../../thingblock-sim/src/checker/inputs'
import type { Rule } from '../../../thingblock-sim/src/checker/rules'
import { Watcher, type CheckReport } from '../../../thingblock-sim/src/checker/watch'
import { loadProject, type Sb3Project } from '../../../thingblock-sim/src/headless'
import { Session } from '../../../thingblock-sim/src/session'
import { parseLesson } from '../../scripts/lessons/parse-lesson.mjs'
import type { RegisterSimGenerators } from '../../src/shared/types'

const TUTORIALS = join(__dirname, '../../src/tutorials')
const PERIPHERALS = readdirSync(join(__dirname, '../../src/extensions/peripheral'))
/** Packs the ThingBot board puts in the palette by itself (its device manifest's `extensions`). */
const BOARD_PACKS = ['thingBotC3', 'ps2']
const WINDOW_US = 5_000_000
/** The worker's tick, in milliseconds. */
const TICK_MS = 16

const simPacks = import.meta.glob<{ registerSimGenerators: RegisterSimGenerators }>(
  '../../src/extensions/peripheral/*/sim.ts',
  { eager: true },
)

let generator: SimGenerator
beforeEach(() => {
  generator = new SimGenerator()
  for (const pack of Object.values(simPacks)) pack.registerSimGenerators(generator as never, Order)
})

const readTb = async (path: string): Promise<Sb3Project> => {
  const zip = await JSZip.loadAsync(readFileSync(path))
  const entry = zip.file('project.json')
  if (!entry) throw new Error(`${path} has no project.json`)
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
  expect(generator.diagnostics, `${tb} uses blocks with no simulation`).toEqual([])
  // A fixed clock keeps every tick within its real-time budget, so each one advances the full 16 ms.
  const session = new Session(code, { now: () => 0 })
  // Set the rig as the step asks the learner to ("hold SW", "distance < 20 cm"…).
  for (const [key, value] of Object.entries(inputsFor(rules))) session.setInput(key, value)
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
  if (!report) throw new Error(`${tb}: no grading result`)
  return { passed: allOk(report), results: report.results }
}

const lessonDirs = readdirSync(TUTORIALS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

describe.each(lessonDirs)('lesson %s', (id) => {
  const dir = join(TUTORIALS, id)
  const files = readdirSync(dir)
  const { lesson } = parseLesson(readFileSync(join(dir, 'lesson.vi.md'), 'utf8'), { dirName: id, lang: 'vi', files })
  const graded = lesson.steps.map((s, i) => ({ step: s, n: i + 1 })).filter(({ step }) => step.rules.length)
  const rulesOf = (n: number): Rule[] => {
    const found = graded.find((g) => g.n === n)
    if (!found) throw new Error(`step ${n} has no rules`)
    return found.step.rules
  }
  const fixture = (name: string) => join(dir, 'solutions', name)

  it('has at least one graded step and a correct solution', () => {
    expect(graded.length).toBeGreaterThan(0)
    expect(existsSync(fixture('pass.tb')) || graded.every(({ n }) => existsSync(fixture(`pass-${n}.tb`)))).toBe(true)
  })

  it('declares in peripherals every peripheral its solutions use, so their blocks are in the palette', async () => {
    const used = new Set<string>()
    for (const name of readdirSync(join(dir, 'solutions')).filter((f) => /^pass.*\.tb$/.test(f))) {
      const project = await readTb(fixture(name))
      for (const target of project.targets) {
        for (const block of Object.values(target.blocks)) {
          if (Array.isArray(block)) continue
          const pack = (block as { opcode: string }).opcode.split('_')[0]
          if (PERIPHERALS.includes(pack) && !BOARD_PACKS.includes(pack)) used.add(pack)
        }
      }
    }
    expect([...used].filter((pack) => !lesson.peripherals.includes(pack))).toEqual([])
  })

  it.each(graded.map(({ n }) => n))('step %i passes with the correct solution', async (n) => {
    const tb = existsSync(fixture(`pass-${n}.tb`)) ? fixture(`pass-${n}.tb`) : fixture('pass.tb')
    const { results } = await grade(tb, rulesOf(n))
    expect(results.map((r) => r.message)).toEqual(results.map(() => ''))
  })

  it.each(graded.map(({ n }) => n))('step %i fails with its fail-<n>.tb and explains why', async (n) => {
    const tb = fixture(`fail-${n}.tb`)
    expect(existsSync(tb), `missing ${tb}`).toBe(true)
    const { passed, results } = await grade(tb, rulesOf(n))
    expect(passed).toBe(false)
    for (const r of results.filter((r) => !r.ok)) expect(r.message).not.toBe('')
  })
})
