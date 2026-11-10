/**
 * The Camera AI lessons prove themselves like the board lessons do: `kiem-thu/dung*.tb` passes each graded
 * step and `sai-<n>.tb` fails step n. A step is graded as the editor's lesson panel grades it, on the
 * playground: the project runs in the real VM, a synthetic hand plays in front of the camera, and the step
 * passes if its rules all hold at some frame within the window. The hand does what the step asks the
 * learner to: it makes the gesture a `tay …` rule names, chases the playground's objects when the step
 * wants points, and otherwise rests at one spot away from where the objects start.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluateCameraRules } from '../../../thingblock-sim/src/checker/camera'
import type { RuleResult } from '../../../thingblock-sim/src/checker/evaluate'
import { isCameraRule, type CameraRule } from '../../../thingblock-sim/src/checker/rules'
import { parseLesson } from '../../scripts/lessons/parse-lesson.mjs'
import { CameraAiRun, type Player } from '../support/camera-ai-vm'

const TUTORIALS = join(__dirname, '../../src/tutorials')
const WINDOW_MS = 3000
/** Where the hand rests when the step does not ask it to chase anything: away from every starting spot. */
const REST = { x: 100, y: -60 }
/** How long the chasing hand stays on one object before moving to the next. */
const CHASE_MS = 300

/**
 * The hand a step's rules ask the learner for.
 * @param rules The step's rules.
 * @returns Where the hand is each frame, and its gesture.
 */
const playerFor = (rules: CameraRule[]): Player => {
  const gestureRule = rules.find((r) => r.kind === 'gesture')
  const gesture = gestureRule?.kind === 'gesture' ? gestureRule.gesture : 'open'
  if (!rules.some((r) => r.kind === 'score')) return () => ({ ...REST, gesture })
  return ({ playground }) => {
    const { objects } = playground
    if (!objects.length) return { ...REST, gesture }
    const o = objects[Math.floor(Date.now() / CHASE_MS) % objects.length]
    return { x: o.x, y: o.y, gesture }
  }
}

const grade = async (tb: string, rules: CameraRule[]): Promise<{ passed: boolean; results: RuleResult[] }> => {
  const run = await CameraAiRun.load(readFileSync(tb))
  let results: RuleResult[] = []
  try {
    run.play(playerFor(rules))
    const passed = await run.until(() => {
      results = evaluateCameraRules(rules, run.graded())
      return results.every((r) => r.ok)
    }, WINDOW_MS)
    return { passed, results }
  } finally {
    run.stop()
  }
}

const lessons = readdirSync(TUTORIALS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const dir = join(TUTORIALS, d.name)
    const files = readdirSync(dir)
    const { lesson } = parseLesson(readFileSync(join(dir, 'bai.vi.md'), 'utf8'), {
      dirName: d.name,
      lang: 'vi',
      files,
    })
    return { ma: d.name, dir, lesson }
  })
  .filter(({ lesson }) => lesson.steps.some((s) => s.rules.some(isCameraRule)))

describe.each(lessons)('Camera AI lesson $ma', ({ dir, lesson }) => {
  const graded = lesson.steps
    .map((s, i) => ({ rules: s.rules.filter(isCameraRule), n: i + 1 }))
    .filter(({ rules }) => rules.length)
  const rulesOf = (n: number) => graded.find((g) => g.n === n)?.rules ?? []
  const fixture = (name: string) => join(dir, 'kiem-thu', name)

  it('runs without a board, loads Camera AI and has a correct solution', () => {
    expect(lesson.bo).toBe('khong')
    expect(lesson.moRong).toContain('cameraAi')
    expect(existsSync(fixture('dung.tb')) || graded.every(({ n }) => existsSync(fixture(`dung-${n}.tb`)))).toBe(true)
  })

  it.each(graded.map(({ n }) => n))(
    'step %i passes with the correct solution',
    async (n) => {
      const tb = existsSync(fixture(`dung-${n}.tb`)) ? fixture(`dung-${n}.tb`) : fixture('dung.tb')
      const { results } = await grade(tb, rulesOf(n))
      expect(results.map((r) => r.message)).toEqual(results.map(() => ''))
    },
    WINDOW_MS + 2000,
  )

  it.each(graded.map(({ n }) => n))(
    'step %i fails with its sai-<n>.tb and explains why',
    async (n) => {
      const tb = fixture(`sai-${n}.tb`)
      expect(existsSync(tb), `thiếu ${tb}`).toBe(true)
      const { passed, results } = await grade(tb, rulesOf(n))
      expect(passed).toBe(false)
      for (const r of results.filter((x) => !x.ok)) expect(r.message).not.toBe('')
    },
    WINDOW_MS + 2000,
  )
})
