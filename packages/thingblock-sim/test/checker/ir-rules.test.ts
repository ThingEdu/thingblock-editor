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
    ['chọn bóng tối màu', { kind: 'ball', dark: true }],
    ['Chọn bóng sáng màu', { kind: 'ball', dark: false }],
    ['đọc mắt hồng ngoại IO4', { kind: 'irRead', pin: 4 }],
    ['đọc mắt hồng ngoại io 0', { kind: 'irRead', pin: 0 }],
    ['phân loại đúng 6 trứng liền', { kind: 'sorted', streak: 6 }],
    ['phân loại đúng 6 quả trứng liền', { kind: 'sorted', streak: 6 }],
    ['gạt 2 trứng hỏng', { kind: 'rejected', count: 2 }],
  ])('%s', (text, rule) => {
    expect(parseRule(text)).toEqual(rule)
  })

  it('rejects a streak of no eggs and an unknown ball', () => {
    expect(() => parseRule('phân loại đúng 0 trứng liền')).toThrow(RuleSyntaxError)
    expect(() => parseRule('chọn bóng xanh')).toThrow(RuleSyntaxError)
  })
})

describe('ball rule', () => {
  it('reads the ball the rig last put on IO4, and is not met with no ball or a belt reading', () => {
    expect(check('chọn bóng tối màu', [])).toEqual({
      ok: false,
      message: 'Em hãy đặt một quả bóng tối màu (xanh dương hoặc đen) trước mắt hồng ngoại: chọn ở thanh Bóng.',
    })
    expect(check('chọn bóng tối màu', entries(['input', 'adc4', 80])).ok).toBe(false)
    expect(check('chọn bóng tối màu', entries(['input', 'adc4', 300])).ok).toBe(true)
    expect(check('chọn bóng tối màu', entries(['input', 'adc4', 1100])).ok).toBe(true)
    expect(check('chọn bóng tối màu', entries(['input', 'adc4', 300], ['input', 'adc4', 2300])).ok).toBe(false)
    expect(check('chọn bóng sáng màu', entries(['input', 'adc4', 2300])).ok).toBe(true)
    expect(check('chọn bóng sáng màu', entries(['input', 'adc4', 1100]))).toEqual({
      ok: false,
      message: 'Em hãy đặt một quả bóng sáng màu (trắng, vàng hoặc đỏ) trước mắt hồng ngoại: chọn ở thanh Bóng.',
    })
  })
})

describe('IR read rule', () => {
  it('passes once the program reads the pin, and names the pin it reads instead', () => {
    expect(check('đọc mắt hồng ngoại IO4', [])).toEqual({
      ok: false,
      message: 'Chương trình chưa đọc mắt hồng ngoại ở IO4.',
    })
    expect(check('đọc mắt hồng ngoại IO4', entries(['read', 'adc3', 1]))).toEqual({
      ok: false,
      message: 'Chương trình đang đọc chân IO3. Mắt hồng ngoại cắm ở IO4.',
    })
    expect(check('đọc mắt hồng ngoại IO4', entries(['read', 'adc3', 1], ['read', 'adc4', 1])).ok).toBe(true)
  })
})

describe('sorting rules', () => {
  it('needs the belt on the rig', () => {
    expect(check('phân loại đúng 2 trứng liền', [])).toEqual({
      ok: false,
      message: 'Mạch ảo chưa có băng chuyền trứng trước mắt hồng ngoại.',
    })
  })

  it('counts the eggs in the right bin since the last mistake', () => {
    expect(check('phân loại đúng 2 trứng liền', belt()).message).toMatch(/Chưa có quả trứng nào/)
    expect(check('phân loại đúng 2 trứng liền', belt('pass:good', 'reject:bad')).ok).toBe(true)
    expect(check('phân loại đúng 2 trứng liền', belt('pass:good', 'reject:good', 'pass:good'))).toEqual({
      ok: false,
      message:
        'Mới có 1 quả trứng liền nhau vào đúng thùng. Bài cần 2 quả. Quả sai gần nhất: trứng tốt bị gạt vào thùng loại.',
    })
    expect(check('phân loại đúng 2 trứng liền', belt('pass:bad')).message).toMatch(
      /trứng hỏng lọt vào thùng trứng tốt/,
    )
  })

  it('counts bad eggs pushed into the reject bin', () => {
    expect(check('gạt 2 trứng hỏng', belt('reject:bad', 'reject:good', 'pass:bad')).ok).toBe(false)
    expect(check('gạt 2 trứng hỏng', belt('reject:bad', 'pass:good', 'reject:bad')).ok).toBe(true)
  })
})

describe('inputsFor: IR eye and belt', () => {
  it('puts the darkest or the brightest ball in front of the eye, and the belt for the sorting rules', () => {
    expect(inputsFor([parseRule('chọn bóng tối màu'), parseRule('L1 sáng')])).toEqual({ adc4: 300 })
    expect(inputsFor([parseRule('chọn bóng sáng màu')])).toEqual({ adc4: 3500 })
    expect(inputsFor([parseRule('phân loại đúng 6 trứng liền'), parseRule('gạt 2 trứng hỏng')])).toEqual({ belt: 1 })
    expect(inputsFor([parseRule('đọc mắt hồng ngoại IO4')])).toEqual({})
  })
})
