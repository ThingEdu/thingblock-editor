// packages/thingblock-sim/test/checker/input-rules.test.ts
/**
 * Rules about what the learner does on the rig (the SW switch, the distance slider, the PS2 pad) and the
 * servo sweep. A step pairs them with an output rule: "hold SW" and "L1 on" must hold at the same tick.
 */
import { describe, expect, it } from 'vitest'
import { evaluateLogRules } from '../../src/checker/evaluate'
import { inputsFor } from '../../src/checker/inputs'
import { parseRule, RuleSyntaxError } from '../../src/checker/rules'
import type { LogEntry } from '../../src/runtime'
import { Session } from '../../src/session'

const inputLog = (...rows: [number, string, number][]): LogEntry[] =>
  rows.map(([ms, key, value]) => ({ t: ms * 1000, dev: 'input', key, value }))
const servoLog = (...rows: [number, number][]): LogEntry[] =>
  rows.map(([ms, duty]) => ({ t: ms * 1000, dev: 'pca9685', key: 'ch12', value: duty }))
const check = (rule: string, log: LogEntry[]) => evaluateLogRules([parseRule(rule)], log)[0]
// Duty for an angle, as servoSetAngle maps it (SERVO_PULSE 102..512).
const duty = (deg: number) => Math.round(102 + (deg * (512 - 102)) / 180)

describe('parseRule: rig inputs and sweep', () => {
  it.each([
    ['giữ nút SW', { kind: 'switch', held: true }],
    ['nhả nút SW', { kind: 'switch', held: false }],
    ['khoảng cách < 20 cm', { kind: 'distance', op: '<', cm: 20 }],
    ['khoảng cách <= 20 cm', { kind: 'distance', op: '≤', cm: 20 }],
    ['khoảng cách ≥ 50 cm', { kind: 'distance', op: '≥', cm: 50 }],
    ['khoảng cách > 30cm', { kind: 'distance', op: '>', cm: 30 }],
    ['giữ nút PS2 lên', { kind: 'ps2', button: 'PSB_PAD_UP' }],
    ['giữ nút PS2 ▼', { kind: 'ps2', button: 'PSB_PAD_DOWN' }],
    ['giữ nút PS2 tam giác', { kind: 'ps2', button: 'PSB_TRIANGLE' }],
    ['giữ nút PS2 R1', { kind: 'ps2', button: 'PSB_R1' }],
    ['servo S1 quét từ 0 đến 180 độ', { kind: 'servoSweep', target: 'S1', from: 0, to: 180, tolerance: 5 }],
    ['servo S2 quét từ 30 đến 150 độ ± 10', { kind: 'servoSweep', target: 'S2', from: 30, to: 150, tolerance: 10 }],
  ])('%s', (text, rule) => {
    expect(parseRule(text)).toEqual(rule)
  })

  it('rejects an unknown PS2 button and a sweep that goes nowhere', () => {
    expect(() => parseRule('giữ nút PS2 bay')).toThrow(RuleSyntaxError)
    expect(() => parseRule('servo S1 quét từ 90 đến 90 độ')).toThrow(RuleSyntaxError)
  })
})

describe('switch rule', () => {
  it('reads the last level the rig drove onto GPIO 3, released when never touched', () => {
    expect(check('nhả nút SW', []).ok).toBe(true)
    expect(check('giữ nút SW', [])).toEqual({ ok: false, message: 'Em hãy giữ nút SW trên mạch ảo.' })
    expect(check('giữ nút SW', inputLog([10, 'gpio3', 0])).ok).toBe(true)
    expect(check('giữ nút SW', inputLog([10, 'gpio3', 0], [20, 'gpio3', 1])).ok).toBe(false)
    expect(check('nhả nút SW', inputLog([10, 'gpio3', 0]))).toEqual({
      ok: false,
      message: 'Em hãy nhả nút SW ra.',
    })
  })
})

describe('distance rule', () => {
  it('reads the slider, 100 cm when never moved', () => {
    expect(check('khoảng cách ≥ 50 cm', []).ok).toBe(true)
    expect(check('khoảng cách < 20 cm', [])).toEqual({
      ok: false,
      message: 'Vật đang cách cảm biến 100 cm. Bước này cần vật gần hơn 20 cm: kéo thanh khoảng cách xuống.',
    })
    expect(check('khoảng cách < 20 cm', inputLog([10, 'ultrasonic', 10])).ok).toBe(true)
    expect(check('khoảng cách ≤ 20 cm', inputLog([10, 'ultrasonic', 20])).ok).toBe(true)
    expect(check('khoảng cách > 30 cm', inputLog([10, 'ultrasonic', 10]))).toEqual({
      ok: false,
      message: 'Vật đang cách cảm biến 10 cm. Bước này cần vật xa hơn 30 cm: kéo thanh khoảng cách lên.',
    })
  })
})

describe('PS2 rule', () => {
  it('passes while the button is held on the virtual pad', () => {
    expect(check('giữ nút PS2 lên', [])).toEqual({
      ok: false,
      message: 'Em hãy giữ nút ▲ trên tay cầm PS2 ảo.',
    })
    expect(check('giữ nút PS2 lên', inputLog([10, 'ps2:PSB_PAD_UP', 1])).ok).toBe(true)
    expect(check('giữ nút PS2 lên', inputLog([10, 'ps2:PSB_PAD_UP', 1], [20, 'ps2:PSB_PAD_UP', 0])).ok).toBe(false)
  })
})

describe('servo sweep rule', () => {
  it('passes once the servo has been near both ends', () => {
    expect(
      check('servo S1 quét từ 0 đến 180 độ', servoLog([0, duty(0)], [500, duty(90)], [1000, duty(180)])).ok,
    ).toBe(true)
  })
  it('fails and says how far it went', () => {
    expect(check('servo S1 quét từ 0 đến 180 độ', servoLog([0, duty(90)], [1000, duty(180)]))).toEqual({
      ok: false,
      message: 'Servo S1 mới quay trong khoảng 90 đến 180 độ. Bài cần quét từ 0 đến 180 độ.',
    })
    expect(check('servo S1 quét từ 0 đến 180 độ', [])).toEqual({ ok: false, message: 'Servo S1 chưa được đặt góc.' })
  })
})

describe('inputsFor', () => {
  it('sets the rig so each input rule holds, for grading a solution headless', () => {
    const rules = ['giữ nút SW', 'khoảng cách < 20 cm', 'giữ nút PS2 xuống', 'L1 sáng'].map(parseRule)
    expect(inputsFor(rules)).toEqual({ gpio3: 0, ultrasonic: 10, 'ps2:PSB_PAD_DOWN': 1 })
    expect(inputsFor([parseRule('khoảng cách ≥ 50 cm'), parseRule('nhả nút SW')])).toEqual({
      ultrasonic: 100,
      gpio3: 1,
    })
    for (const text of ['khoảng cách < 3 cm', 'khoảng cách > 300 cm', 'khoảng cách ≤ 2 cm']) {
      const rule = parseRule(text)
      const log = inputLog([0, 'ultrasonic', inputsFor([rule]).ultrasonic])
      expect(evaluateLogRules([rule], log)[0].ok, text).toBe(true)
    }
  })
})

describe('the board logs rig inputs', () => {
  it('so the checker sees what the learner set', () => {
    const session = new Session('function* setup() {} function* loop() {} return { setup, loop };', { now: () => 0 })
    session.setInput('ultrasonic', 12)
    session.setInput('ultrasonic', 12)
    session.setInput('gpio3', 0)
    expect(session.log.filter((e) => e.dev === 'input').map((e) => [e.key, e.value])).toEqual([
      ['ultrasonic', 12],
      ['gpio3', 0],
    ])
  })
})
