/**
 * Rules for the IR eye on IO4 and the egg belt: the ball the learner puts in front of the eye (like "giữ nút
 * SW", something the learner does), the pin the program reads, and how well the belt sorts.
 */
import { describe, expect, it } from 'vitest'
import { evaluateLogRules } from '../../src/checker/evaluate'
import { inputsFor } from '../../src/checker/inputs'
import { parseRule, RuleSyntaxError } from '../../src/checker/rules'
import type { LogEntry } from '../../src/runtime'

const entries = (...rows: [string, string, number | string][]): LogEntry[] =>
  rows.map(([dev, key, value], i) => ({ t: i * 1000, dev, key, value }))
const check = (rule: string, log: LogEntry[]) => evaluateLogRules([parseRule(rule)], log)[0]
const belt = (...fates: string[]): LogEntry[] =>
  entries(
    ['input', 'belt', 1],
    ...fates.map((f): [string, string, string] => ['belt', ...(f.split(':') as [string, string])]),
  )

describe('parseRule: IR eye and belt', () => {
  it.each([
    ['pick dark ball', { kind: 'ball', dark: true }],
    ['pick bright ball', { kind: 'ball', dark: false }],
    ['read IR eye IO4', { kind: 'irRead', pin: 4 }],
    ['read IR eye IO0', { kind: 'irRead', pin: 0 }],
    ['sort 6 eggs in a row', { kind: 'sorted', streak: 6 }],
    ['sort 6 eggs in a row', { kind: 'sorted', streak: 6 }],
    ['reject 2 bad eggs', { kind: 'rejected', count: 2 }],
  ])('%s', (text, rule) => {
    expect(parseRule(text)).toEqual(rule)
  })

  it('rejects a streak of no eggs and an unknown ball', () => {
    expect(() => parseRule('sort 0 eggs in a row')).toThrow(RuleSyntaxError)
    expect(() => parseRule('pick green ball')).toThrow(RuleSyntaxError)
  })
})

describe('ball rule', () => {
  it('reads the ball the rig last put on IO4, and is not met with no ball or a belt reading', () => {
    expect(check('pick dark ball', [])).toEqual({
      ok: false,
      message: 'Em hãy đặt một quả bóng tối màu (xanh dương hoặc đen) trước mắt hồng ngoại: chọn ở thanh Bóng.',
    })
    expect(check('pick dark ball', entries(['input', 'adc4', 80])).ok).toBe(false)
    expect(check('pick dark ball', entries(['input', 'adc4', 300])).ok).toBe(true)
    expect(check('pick dark ball', entries(['input', 'adc4', 1100])).ok).toBe(true)
    expect(check('pick dark ball', entries(['input', 'adc4', 300], ['input', 'adc4', 2300])).ok).toBe(false)
    expect(check('pick bright ball', entries(['input', 'adc4', 2300])).ok).toBe(true)
    expect(check('pick bright ball', entries(['input', 'adc4', 1100]))).toEqual({
      ok: false,
      message: 'Em hãy đặt một quả bóng sáng màu (trắng, vàng hoặc đỏ) trước mắt hồng ngoại: chọn ở thanh Bóng.',
    })
  })
})

describe('IR read rule', () => {
  it('passes once the program reads the pin, and names the pin it reads instead', () => {
    expect(check('read IR eye IO4', [])).toEqual({
      ok: false,
      message: 'Chương trình chưa đọc mắt hồng ngoại ở IO4.',
    })
    expect(check('read IR eye IO4', entries(['read', 'adc3', 1]))).toEqual({
      ok: false,
      message: 'Chương trình đang đọc chân IO3. Mắt hồng ngoại cắm ở IO4.',
    })
    expect(check('read IR eye IO4', entries(['read', 'adc3', 1], ['read', 'adc4', 1])).ok).toBe(true)
  })
})

describe('sorting rules', () => {
  it('needs the belt on the rig', () => {
    expect(check('sort 2 eggs in a row', [])).toEqual({
      ok: false,
      message: 'Mạch ảo chưa có băng chuyền trứng trước mắt hồng ngoại.',
    })
  })

  it('counts the eggs in the right bin since the last mistake', () => {
    expect(check('sort 2 eggs in a row', belt()).message).toMatch(/Chưa có quả trứng nào/)
    expect(check('sort 2 eggs in a row', belt('pass:good', 'reject:bad')).ok).toBe(true)
    expect(check('sort 2 eggs in a row', belt('pass:good', 'reject:good', 'pass:good'))).toEqual({
      ok: false,
      message:
        'Mới có 1 quả trứng liền nhau vào đúng thùng. Bài cần 2 quả. Quả sai gần nhất: trứng tốt bị gạt vào thùng loại.',
    })
    expect(check('sort 2 eggs in a row', belt('pass:bad')).message).toMatch(/trứng hỏng lọt vào thùng trứng tốt/)
  })

  it('counts bad eggs pushed into the reject bin', () => {
    expect(check('reject 2 bad eggs', belt('reject:bad', 'reject:good', 'pass:bad')).ok).toBe(false)
    expect(check('reject 2 bad eggs', belt('reject:bad', 'pass:good', 'reject:bad')).ok).toBe(true)
  })
})

describe('inputsFor: IR eye and belt', () => {
  it('puts the darkest or the brightest ball in front of the eye, and the belt for the sorting rules', () => {
    expect(inputsFor([parseRule('pick dark ball'), parseRule('L1 on')])).toEqual({ adc4: 300 })
    expect(inputsFor([parseRule('pick bright ball')])).toEqual({ adc4: 3500 })
    expect(inputsFor([parseRule('sort 6 eggs in a row'), parseRule('reject 2 bad eggs')])).toEqual({ belt: 1 })
    expect(inputsFor([parseRule('read IR eye IO4')])).toEqual({})
  })
})
