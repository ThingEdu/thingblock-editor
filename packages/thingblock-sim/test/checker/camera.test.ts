import { describe, expect, it } from 'vitest'
import { evaluateCameraRules, handsOnStage, type CameraSnapshot } from '../../src/checker/camera'
import { evaluateLogRules } from '../../src/checker/evaluate'
import { isCameraRule, parseRule, RuleSyntaxError, type CameraRule } from '../../src/checker/rules'

describe('Camera AI rules', () => {
  it.each([
    ['camera bật', { kind: 'cameraOn' }],
    ['Thấy bàn tay', { kind: 'handSeen' }],
    ['tay nắm', { kind: 'gesture', gesture: 'fist' }],
    ['tay xòe', { kind: 'gesture', gesture: 'open' }],
    ['tay chữ V', { kind: 'gesture', gesture: 'victory' }],
    ['sân chơi có "sao"', { kind: 'object', name: 'sao' }],
    ['"sao" chạm ngón trỏ', { kind: 'touch', name: 'sao', part: 'indexTip' }],
    ['"ro" chạm  lòng bàn tay', { kind: 'touch', name: 'ro', part: 'palm' }],
    ['điểm người chơi 1 ≥ 1', { kind: 'score', player: 1, op: '≥', n: 1 }],
    ['điểm người chơi 2 >= 3', { kind: 'score', player: 2, op: '≥', n: 3 }],
    ['điểm người chơi 1 = 0', { kind: 'score', player: 1, op: '=', n: 0 }],
    ['sân chơi nói "Nắm tay"', { kind: 'say', text: 'Nắm tay' }],
  ])('%s', (text, rule) => {
    const parsed = parseRule(text)
    expect(parsed).toEqual(rule)
    expect(isCameraRule(parsed)).toBe(true)
  })

  it('keeps board rules out of the Camera AI kind', () => {
    expect(isCameraRule(parseRule('L1 sáng'))).toBe(false)
  })

  it('names the gestures and hand parts it knows when one is misspelt', () => {
    expect(() => parseRule('tay vẫy')).toThrow(RuleSyntaxError)
    expect(() => parseRule('tay vẫy')).toThrow(/nắm/)
    expect(() => parseRule('"sao" chạm mũi')).toThrow(/ngón trỏ/)
  })

  it('tells the simulator a Camera AI rule is not its to grade', () => {
    const [result] = evaluateLogRules([parseRule('camera bật')], [])
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
    ...over,
  })

  it('passes when the playground shows what the rules ask', () => {
    const results = evaluateCameraRules(
      rules(
        'camera bật',
        'thấy bàn tay',
        'tay nắm',
        'sân chơi có "sao"',
        '"sao" chạm ngón trỏ',
        'điểm người chơi 1 ≥ 2',
        'sân chơi nói "Nắm tay"',
      ),
      snapshot(),
    )
    expect(results.map((r) => r.message)).toEqual(results.map(() => ''))
  })

  it("explains each miss in the learner's words", () => {
    const results = evaluateCameraRules(
      rules('camera bật', 'thấy bàn tay', 'sân chơi có "de"', 'điểm người chơi 1 ≥ 3', 'sân chơi nói "Xòe tay"'),
      snapshot({ cameraOn: false, hands: [] }),
    )
    expect(results.every((r) => !r.ok && r.message !== '')).toBe(true)
    expect(results[0].message).toBe('Camera chưa bật.')
    expect(results[3].message).toMatch(/đang là 2/)
  })

  it("touches within the picture plus the extension's margin, and asks for the right gesture", () => {
    const far = snapshot({ objects: [{ name: 'sao', x: 50, y: 0, size: 50 }] })
    expect(evaluateCameraRules(rules('"sao" chạm ngón trỏ'), far)[0].ok).toBe(false)
    const edge = snapshot({ objects: [{ name: 'sao', x: 39, y: 0, size: 50 }] })
    expect(evaluateCameraRules(rules('"sao" chạm ngón trỏ'), edge)[0].ok).toBe(true)
    expect(evaluateCameraRules(rules('tay xòe'), snapshot())[0].message).toMatch(/xòe tay/)
  })
})
