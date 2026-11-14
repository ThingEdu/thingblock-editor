import { describe, expect, it } from 'vitest'
import { evaluateCameraRules, handsOnStage, headOnStage, type CameraSnapshot } from '../../src/checker/camera'
import { evaluateLogRules } from '../../src/checker/evaluate'
import { isCameraRule, parseRule, RuleSyntaxError, type CameraRule } from '../../src/checker/rules'

describe('Camera AI rules', () => {
  it.each([
    ['camera on', { kind: 'cameraOn' }],
    ['Hand Seen', { kind: 'handSeen' }],
    ['hand fist', { kind: 'gesture', gesture: 'fist' }],
    ['hand open', { kind: 'gesture', gesture: 'open' }],
    ['hand victory', { kind: 'gesture', gesture: 'victory' }],
    ['playground has "sao"', { kind: 'object', name: 'sao' }],
    ['"sao" touches index finger', { kind: 'touch', name: 'sao', part: 'indexTip' }],
    ['"ro" touches  palm', { kind: 'touch', name: 'ro', part: 'palm' }],
    ['player 1 score ≥ 1', { kind: 'score', player: 1, op: '≥', n: 1 }],
    ['player 2 score >= 3', { kind: 'score', player: 2, op: '≥', n: 3 }],
    ['player 1 score = 0', { kind: 'score', player: 1, op: '=', n: 0 }],
    ['playground says "Nắm tay"', { kind: 'say', text: 'Nắm tay' }],
    ['head seen', { kind: 'headSeen' }],
    ['head tilts left', { kind: 'headTilt', dir: 'left' }],
    ['Head tilts straight', { kind: 'headTilt', dir: 'straight' }],
    ['"bong" touches head', { kind: 'touch', name: 'bong', part: 'head' }],
    ['arms flap', { kind: 'motion', motion: 'flap' }],
    ['head nods', { kind: 'motion', motion: 'nod' }],
  ])('%s', (text, rule) => {
    const parsed = parseRule(text)
    expect(parsed).toEqual(rule)
    expect(isCameraRule(parsed)).toBe(true)
  })

  it('keeps board rules out of the Camera AI kind', () => {
    expect(isCameraRule(parseRule('L1 on'))).toBe(false)
  })

  it('names the gestures and hand parts it knows when one is misspelt', () => {
    expect(() => parseRule('hand wave')).toThrow(RuleSyntaxError)
    expect(() => parseRule('hand wave')).toThrow(/fist/)
    expect(() => parseRule('"sao" touches nose')).toThrow(/index finger/)
  })

  it('tells the simulator a Camera AI rule is not its to grade', () => {
    const [result] = evaluateLogRules([parseRule('camera on')], [])
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/Sân chơi/)
  })
})

/**
 * A hand with every landmark at one frame point.
 * @param x Frame x, 0…1.
 * @param y Frame y, 0…1.
 * @param gesture The gesture it makes.
 * @returns The hand, as the tracker reports one.
 */
const handAt = (x: number, y: number, gesture = 'open') => ({
  gesture,
  landmarks: Array.from({ length: 21 }, () => ({ x, y })),
})

describe('handsOnStage', () => {
  it('maps frame points to the stage, mirrored like the picture', () => {
    const [mirrored] = handsOnStage({ hands: [handAt(0.25, 0.25)], mirror: true })
    expect(mirrored.parts.indexTip).toEqual({ x: 120, y: 90 })
    const [plain] = handsOnStage({ hands: [handAt(0.25, 0.25)], mirror: false })
    expect(plain.parts.palm).toEqual({ x: -120, y: 90 })
  })

  it('takes the palm as the middle of the five palm landmarks', () => {
    const hand = handAt(0.5, 0.5)
    hand.landmarks[0] = { x: 0.5, y: 1 }
    const [h] = handsOnStage({ hands: [hand], mirror: false })
    expect(h.parts.wrist).toEqual({ x: 0, y: -180 })
    expect(h.parts.palm).toEqual({ x: 0, y: -36 })
  })
})

describe('evaluateCameraRules', () => {
  const rules = (...texts: string[]) => texts.map((t) => parseRule(t) as CameraRule)
  const snapshot = (over: Partial<CameraSnapshot> = {}): CameraSnapshot => ({
    cameraOn: true,
    hands: handsOnStage({ hands: [handAt(0.5, 0.5, 'fist')], mirror: true }),
    objects: [{ name: 'sao', x: 10, y: 0, size: 50 }],
    scores: [2, 0],
    say: 'Nắm tay ✊',
    head: null,
    motions: [],
    ...over,
  })

  it('passes when the playground shows what the rules ask', () => {
    const results = evaluateCameraRules(
      rules(
        'camera on',
        'hand seen',
        'hand fist',
        'playground has "sao"',
        '"sao" touches index finger',
        'player 1 score ≥ 2',
        'playground says "Nắm tay"',
      ),
      snapshot(),
    )
    expect(results.map((r) => r.message)).toEqual(results.map(() => ''))
  })

  it("explains each miss in the learner's words", () => {
    const results = evaluateCameraRules(
      rules('camera on', 'hand seen', 'playground has "de"', 'player 1 score ≥ 3', 'playground says "Xòe tay"'),
      snapshot({ cameraOn: false, hands: [] }),
    )
    expect(results.every((r) => !r.ok && r.message !== '')).toBe(true)
    expect(results[0].message).toBe('Camera chưa bật.')
    expect(results[3].message).toMatch(/đang là 2/)
  })

  it("touches within the picture plus the extension's margin, and asks for the right gesture", () => {
    const far = snapshot({ objects: [{ name: 'sao', x: 50, y: 0, size: 50 }] })
    expect(evaluateCameraRules(rules('"sao" touches index finger'), far)[0].ok).toBe(false)
    const edge = snapshot({ objects: [{ name: 'sao', x: 39, y: 0, size: 50 }] })
    expect(evaluateCameraRules(rules('"sao" touches index finger'), edge)[0].ok).toBe(true)
    expect(evaluateCameraRules(rules('hand open'), snapshot())[0].message).toMatch(/xòe tay/)
  })
})

describe('head rules', () => {
  /**
   * A pose with the nose at a frame point and the eye on the frame's right lowered by `dy`.
   * @param x Frame x of the nose.
   * @param y Frame y of the nose.
   * @param dy How much lower the right eye is, in frame heights.
   * @returns The 33 landmarks the pose model would report.
   */
  const poseAt = (x: number, y: number, dy = 0) => {
    const landmarks = Array.from({ length: 33 }, () => ({ x, y: 0.95, visibility: 0.1 }))
    landmarks[0] = { x, y, visibility: 0.99 }
    landmarks[2] = { x: x - 0.03, y: y - 0.02, visibility: 0.99 }
    landmarks[5] = { x: x + 0.03, y: y - 0.02 + dy, visibility: 0.99 }
    return { landmarks }
  }
  const rules = (...texts: string[]) => texts.map((t) => parseRule(t) as CameraRule)
  const base: CameraSnapshot = {
    cameraOn: true,
    hands: [],
    head: null,
    motions: [],
    objects: [{ name: 'bong', x: 0, y: 0, size: 50 }],
    scores: [0, 0],
    say: '',
  }

  it('finds the head like the head blocks: the nose on the stage, leaning by the eyes', () => {
    expect(headOnStage({ hands: [], mirror: false, pose: poseAt(0.5, 0.5) })).toMatchObject({ x: 0, y: 0, tilt: 0 })
    expect(headOnStage({ hands: [], mirror: false, pose: poseAt(0.5, 0.5, 0.04) })?.tilt).toBeGreaterThan(15)
    expect(headOnStage({ hands: [], mirror: true, pose: poseAt(0.5, 0.5, 0.04) })?.tilt).toBeLessThan(-15)
    expect(headOnStage({ hands: [], mirror: true })).toBeNull()
  })

  it('grades seeing the head, a lean, a head touch and the movements', () => {
    const head = headOnStage({ hands: [], mirror: true, pose: poseAt(0.5, 0.5, 0.04) })
    const ok = evaluateCameraRules(rules('head seen', 'head tilts left', '"bong" touches head', 'arms flap'), {
      ...base,
      head,
      motions: ['flap'],
    })
    expect(ok.map((r) => r.message)).toEqual(['', '', '', ''])
    const missed = evaluateCameraRules(rules('head seen', 'head tilts right', 'head nods'), { ...base, head: null })
    expect(missed.every((r) => !r.ok && r.message !== '')).toBe(true)
    expect(evaluateCameraRules(rules('head tilts right'), { ...base, head })[0].message).toMatch(/phải/)
  })
})
