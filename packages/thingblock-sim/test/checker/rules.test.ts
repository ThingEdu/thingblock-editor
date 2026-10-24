import { describe, expect, it } from 'vitest'
import { BLINK_MAX_PERIOD_S, parseRule, RuleSyntaxError } from '../../src/checker/rules'

describe('parseRule', () => {
  it.each([
    ['L1 sáng', { kind: 'light', target: 'L1', on: true }],
    ['L2 tắt', { kind: 'light', target: 'L2', on: false }],
    ['còi kêu', { kind: 'buzzer', on: true }],
    ['còi tắt', { kind: 'buzzer', on: false }],
    ['L1 nhấp nháy, chu kỳ 1 giây ± 20%', { kind: 'blink', target: 'L1', periodS: 1, tolerance: 0.2 }],
    ['L1 nhấp nháy, chu kỳ 1 giây', { kind: 'blink', target: 'L1', periodS: 1, tolerance: 0.2 }],
    ['M1 tiến', { kind: 'motor', target: 'M1', state: 'forward' }],
    ['M2 lùi', { kind: 'motor', target: 'M2', state: 'backward' }],
    ['M4 dừng', { kind: 'motor', target: 'M4', state: 'stop' }],
    ['M1 tốc độ ≥ 50', { kind: 'motorSpeed', target: 'M1', minPercent: 50 }],
    ['M1 tốc độ >= 50', { kind: 'motorSpeed', target: 'M1', minPercent: 50 }],
    ['servo S1 ở 90 độ ± 5', { kind: 'servo', target: 'S1', angle: 90, tolerance: 5 }],
    ['servo S3 ở 45 độ', { kind: 'servo', target: 'S3', angle: 45, tolerance: 5 }],
    ['OLED hiện "Xin chào"', { kind: 'oled', text: 'Xin chào', exact: false }],
    ['OLED hiện đúng "1"', { kind: 'oled', text: '1', exact: true }],
  ])('%s', (text, rule) => {
    expect(parseRule(text)).toEqual(rule)
  })

  // Review Focus 3: a teacher's spacing, casing and decimal comma must not matter.
  it('ignores case, extra spaces and accepts a decimal comma', () => {
    expect(parseRule('  l1   SÁNG ')).toEqual({ kind: 'light', target: 'L1', on: true })
    expect(parseRule('L1 nhấp nháy , chu kỳ 0,5 giây ± 10 %')).toEqual({
      kind: 'blink',
      target: 'L1',
      periodS: 0.5,
      tolerance: 0.1,
    })
  })

  it('rejects a blink period the 5 s check window cannot measure', () => {
    expect(() => parseRule(`L1 nhấp nháy, chu kỳ ${BLINK_MAX_PERIOD_S + 0.1} giây`)).toThrow(RuleSyntaxError)
    expect(() => parseRule('L1 nhấp nháy, chu kỳ 2 giây')).toThrow(/1\.5/)
  })

  it('accepts surplus whitespace, any case and NFD input in OLED rules, keeping the quoted text as written', () => {
    expect(parseRule('  oled   HIỆN   Đúng "Xin  Chào" ')).toEqual({
      kind: 'oled',
      text: 'Xin  Chào',
      exact: true,
    })
    expect(parseRule('OLED  hiện "x"')).toEqual({ kind: 'oled', text: 'x', exact: false })
    expect(parseRule('OLED hiện "e\u0301"')).toEqual({ kind: 'oled', text: '\u00e9', exact: false })
  })

  it('names the unparsed text in the error', () => {
    let error: unknown
    try {
      parseRule('L3 sáng')
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(RuleSyntaxError)
    expect((error as RuleSyntaxError).input).toBe('L3 sáng')
    expect((error as Error).message).toContain('L3 sáng')
  })
})
