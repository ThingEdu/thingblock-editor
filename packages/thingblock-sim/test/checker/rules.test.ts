import { describe, expect, it } from 'vitest'
import { BLINK_MAX_PERIOD_S, parseRule, RuleSyntaxError } from '../../src/checker/rules'

describe('parseRule', () => {
  it.each([
    ['L1 on', { kind: 'light', target: 'L1', on: true }],
    ['L2 off', { kind: 'light', target: 'L2', on: false }],
    ['buzzer on', { kind: 'buzzer', on: true }],
    ['buzzer off', { kind: 'buzzer', on: false }],
    ['L1 blinks every 1 s ± 20%', { kind: 'blink', target: 'L1', periodS: 1, tolerance: 0.2 }],
    ['L1 blinks every 1 s', { kind: 'blink', target: 'L1', periodS: 1, tolerance: 0.2 }],
    ['M1 forward', { kind: 'motor', target: 'M1', state: 'forward' }],
    ['M2 backward', { kind: 'motor', target: 'M2', state: 'backward' }],
    ['M4 stop', { kind: 'motor', target: 'M4', state: 'stop' }],
    ['M1 speed ≥ 50', { kind: 'motorSpeed', target: 'M1', minPercent: 50 }],
    ['M1 speed ≥ 50%', { kind: 'motorSpeed', target: 'M1', minPercent: 50 }],
    ['M1 speed >= 50', { kind: 'motorSpeed', target: 'M1', minPercent: 50 }],
    ['servo S1 at 90 deg ± 5', { kind: 'servo', target: 'S1', angle: 90, tolerance: 5 }],
    ['servo S3 at 45 deg', { kind: 'servo', target: 'S3', angle: 45, tolerance: 5 }],
    ['OLED shows "Xin chào"', { kind: 'oled', text: 'Xin chào', exact: false }],
    ['OLED shows exactly "1"', { kind: 'oled', text: '1', exact: true }],
    ['OLED shows "ThingBot" at y 16', { kind: 'oled', text: 'ThingBot', exact: false, y: 16 }],
    ['OLED shows "Xin chao" size 12x16', { kind: 'oled', text: 'Xin chao', exact: false, size: { w: 12, h: 16 } }],
  ])('%s', (text, rule) => {
    expect(parseRule(text)).toEqual(rule)
  })

  // Review Focus 3: a teacher's spacing, casing and decimal comma must not matter.
  it('ignores case, extra spaces and accepts a decimal comma', () => {
    expect(parseRule('  l1   ON ')).toEqual({ kind: 'light', target: 'L1', on: true })
    expect(parseRule('L1 blinks every 0,5 s ± 10 %')).toEqual({
      kind: 'blink',
      target: 'L1',
      periodS: 0.5,
      tolerance: 0.1,
    })
  })

  it('rejects a blink period the 5 s check window cannot measure', () => {
    expect(() => parseRule(`L1 blinks every ${BLINK_MAX_PERIOD_S + 0.1} s`)).toThrow(RuleSyntaxError)
    expect(() => parseRule('L1 blinks every 2 s')).toThrow(/1\.5/)
  })

  it('accepts surplus whitespace, any case and NFD input in OLED rules, keeping the quoted text as written', () => {
    expect(parseRule('  oled   SHOWS   Exactly "Xin  Chào" ')).toEqual({
      kind: 'oled',
      text: 'Xin  Chào',
      exact: true,
    })
    expect(parseRule('OLED  shows "x"')).toEqual({ kind: 'oled', text: 'x', exact: false })
    expect(parseRule('OLED shows "e\u0301"')).toEqual({ kind: 'oled', text: '\u00e9', exact: false })
  })

  it('names the unparsed text in the error', () => {
    let error: unknown
    try {
      parseRule('L3 on')
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(RuleSyntaxError)
    expect((error as RuleSyntaxError).input).toBe('L3 on')
    expect((error as Error).message).toContain('L3 on')
  })
})
