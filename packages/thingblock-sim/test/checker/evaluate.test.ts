// packages/thingblock-sim/test/checker/evaluate.test.ts
import { describe, expect, it } from 'vitest'
import { evaluateLogRules } from '../../src/checker/evaluate'
import { parseRule } from '../../src/checker/rules'
import type { LogEntry } from '../../src/runtime'

// Build a PCA9685 duty log from `[virtual ms, channel, duty]` triples.
const pwmLog = (...rows: [number, number, number][]): LogEntry[] =>
  rows.map(([ms, ch, duty]) => ({ t: ms * 1000, dev: 'pca9685', key: `ch${ch}`, value: duty }))
const oledLog = (text: string): LogEntry[] => [{ t: 1000, dev: 'oled', key: 'text', value: text }]
const check = (rule: string, log: LogEntry[]) => evaluateLogRules([parseRule(rule)], log)[0]

describe('light rules', () => {
  it('passes when the LED channel ends lit', () => {
    expect(check('L1 sáng', pwmLog([20, 15, 4096]))).toEqual({ ok: true, message: '' })
  })
  // Review Focus 1: the final state is what counts.
  it('fails when the LED was lit then turned off again', () => {
    expect(check('L1 sáng', pwmLog([20, 15, 4096], [520, 15, 0]))).toEqual({
      ok: false,
      message: 'Đèn L1 chưa sáng.',
    })
  })
  it('fails with nothing logged at all', () => {
    expect(check('L1 sáng', []).ok).toBe(false)
  })
  it('passes "tắt" when the channel was never driven or ends at 0', () => {
    expect(check('L2 tắt', []).ok).toBe(true)
    expect(check('L2 tắt', pwmLog([20, 13, 4096], [40, 13, 0])).ok).toBe(true)
    expect(check('L2 tắt', pwmLog([20, 13, 4096]))).toEqual({
      ok: false,
      message: 'Đèn L2 đang sáng. Bài cần L2 tắt.',
    })
  })
})

describe('buzzer rules', () => {
  it('"kêu" passes if the buzzer sounded at any time', () => {
    expect(check('còi kêu', pwmLog([10, 14, 2048], [300, 14, 0])).ok).toBe(true)
    expect(check('còi kêu', [])).toEqual({ ok: false, message: 'Còi chưa kêu.' })
  })
})

describe('blink rule', () => {
  const blink = (periodMs: number, cycles: number) =>
    pwmLog(
      ...Array.from({ length: cycles }, (_, i): [number, number, number][] => [
        [20 + i * periodMs, 15, 4096],
        [20 + i * periodMs + periodMs / 2, 15, 0],
      ]).flat(),
    )
  it('passes a 1 s blink seen four times', () => {
    expect(check('L1 nhấp nháy, chu kỳ 1 giây ± 20%', blink(1000, 4)).ok).toBe(true)
  })
  it('fails a 0.5 s blink against a 1 s rule and says what it saw', () => {
    expect(check('L1 nhấp nháy, chu kỳ 1 giây ± 20%', blink(500, 8))).toEqual({
      ok: false,
      message: 'Đèn L1 có nhấp nháy, nhưng mỗi lần khoảng 0,5 giây. Bài cần khoảng 1 giây.',
    })
  })
  it('fails when the LED turned off fewer than three times', () => {
    expect(check('L1 nhấp nháy, chu kỳ 1 giây', blink(1000, 2))).toEqual({
      ok: false,
      message: 'Đèn L1 chưa nhấp nháy đủ: cần bật rồi tắt ít nhất 3 lần.',
    })
  })
  // Review Focus 2: the spec grades the median period, so an uneven blink with a 1 s median passes.
  it('grades the median period, so an uneven 300/700 ms blink still passes a 1 s rule', () => {
    const log = pwmLog(
      [0, 15, 4096],
      [300, 15, 0],
      [1000, 15, 4096],
      [1300, 15, 0],
      [2000, 15, 4096],
      [2300, 15, 0],
      [3000, 15, 4096],
      [3300, 15, 0],
    )
    expect(check('L1 nhấp nháy, chu kỳ 1 giây', log).ok).toBe(true)
  })
})

describe('motor rules', () => {
  it('reads forward and backward from the A/B pair', () => {
    expect(check('M1 tiến', pwmLog([10, 2, 2047], [10, 3, 0])).ok).toBe(true)
    expect(check('M1 lùi', pwmLog([10, 2, 0], [10, 3, 2047])).ok).toBe(true)
    expect(check('M1 lùi', pwmLog([10, 2, 2047], [10, 3, 0]))).toEqual({
      ok: false,
      message: 'Động cơ M1 đang tiến. Bài cần M1 lùi.',
    })
  })
  it('"dừng" checks the final state', () => {
    expect(check('M2 dừng', pwmLog([10, 4, 2047], [10, 5, 0], [900, 4, 0])).ok).toBe(true)
    expect(check('M2 dừng', pwmLog([10, 4, 2047], [10, 5, 0]))).toEqual({
      ok: false,
      message: 'Động cơ M2 vẫn đang chạy. Bài cần M2 dừng.',
    })
  })
  it('speed is the peak duty of the driven channel as a percent of 4095', () => {
    expect(check('M1 tốc độ ≥ 50', pwmLog([10, 2, 2047])).ok).toBe(true)
    expect(check('M1 tốc độ ≥ 50', pwmLog([10, 2, 1000]))).toEqual({
      ok: false,
      message: 'Động cơ M1 chạy mạnh nhất khoảng 24%. Bài cần ít nhất 50%.',
    })
  })
})

describe('servo rule', () => {
  it('converts the final duty back to an angle', () => {
    expect(check('servo S1 ở 90 độ ± 5', pwmLog([10, 12, 307])).ok).toBe(true)
    expect(check('servo S1 ở 90 độ ± 5', pwmLog([10, 12, 204]))).toEqual({
      ok: false,
      message: 'Servo S1 đang ở 45 độ. Bài cần khoảng 90 độ.',
    })
    expect(check('servo S1 ở 90 độ', [])).toEqual({ ok: false, message: 'Servo S1 chưa được đặt góc.' })
  })
})

describe('oled rules', () => {
  it('contains, case-insensitively', () => {
    expect(check('OLED hiện "xin chào"', oledLog('Xin chào\nT: 25')).ok).toBe(true)
    expect(check('OLED hiện "Xin chào"', oledLog('T: 25'))).toEqual({
      ok: false,
      message: 'Màn hình chưa hiện chữ "Xin chào".',
    })
  })
  it('"đúng" needs a whole line to match', () => {
    expect(check('OLED hiện đúng "1"', oledLog('1\n')).ok).toBe(true)
    expect(check('OLED hiện đúng "1"', oledLog('10')).ok).toBe(false)
    expect(check('OLED hiện đúng "1"', oledLog(' 1 \n')).ok).toBe(true)
  })
  it('uses the latest text the display logged', () => {
    const log = [...oledLog('Xin chào'), { t: 2000, dev: 'oled', key: 'text', value: '' }]
    expect(check('OLED hiện "Xin chào"', log).ok).toBe(false)
  })
})

it('returns one result per rule, in order', () => {
  const results = evaluateLogRules([parseRule('L1 sáng'), parseRule('L2 tắt')], pwmLog([20, 15, 4096]))
  expect(results.map((r) => r.ok)).toEqual([true, true])
})
