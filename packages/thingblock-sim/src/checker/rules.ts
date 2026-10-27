/**
 * The rule vocabulary a lesson author writes after `kiểm:`. Parsed once at pack build time (Node) and
 * again never: the built lesson carries parsed rules. This module has no imports so the build script
 * can load it through Node's type stripping.
 */
export type LightName = 'L1' | 'L2'
export type MotorName = 'M1' | 'M2' | 'M3' | 'M4'
export type ServoName = 'S1' | 'S2' | 'S3' | 'S4' | 'S5'

export type Rule =
  | { kind: 'light'; target: LightName; on: boolean }
  | { kind: 'buzzer'; on: boolean }
  | { kind: 'blink'; target: LightName; periodS: number; tolerance: number }
  | { kind: 'motor'; target: MotorName; state: 'forward' | 'backward' | 'stop' }
  | { kind: 'motorSpeed'; target: MotorName; minPercent: number }
  | { kind: 'servo'; target: ServoName; angle: number; tolerance: number }
  | { kind: 'oled'; text: string; exact: boolean }

/** Longest blink period the 5 s check window can observe three times (spec §5.3). */
export const BLINK_MAX_PERIOD_S = 1.5
const DEFAULT_BLINK_TOLERANCE = 0.2
const DEFAULT_SERVO_TOLERANCE = 5

export class RuleSyntaxError extends Error {
  readonly input: string
  constructor(input: string, detail: string) {
    super(`Không hiểu luật "${input}": ${detail}`)
    this.name = 'RuleSyntaxError'
    this.input = input
  }
}

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`
const num = (s: string): number => Number(s.replace(',', '.'))
const upper = <T extends string>(s: string): T => s.toUpperCase() as T

// Lower-case, NFC, single spaces, no space before `,`/`%`, and `>=` spelled `≥`. A comma between
// digits is a decimal separator and keeps its form.
const normalize = (text: string): string =>
  text
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ ,/g, ',')
    .replace(/,\s*(?!\d)/g, ', ')
    .replace(/ %/g, '%')
    .replace(/>=/g, '≥')
    .replace(/\+-|\+\/-/g, '±')
    .trim()

export function parseRule(text: string): Rule {
  const t = normalize(text)
  let m: RegExpExecArray | null

  if ((m = /^(l[12]) (sáng|tắt)$/.exec(t))) return { kind: 'light', target: upper(m[1]), on: m[2] === 'sáng' }
  if ((m = /^còi (kêu|tắt)$/.exec(t))) return { kind: 'buzzer', on: m[1] === 'kêu' }
  if ((m = new RegExp(String.raw`^(l[12]) nhấp nháy, chu kỳ ${NUMBER} giây(?: ± ${NUMBER}%)?$`).exec(t))) {
    const periodS = num(m[2])
    if (periodS > BLINK_MAX_PERIOD_S) {
      throw new RuleSyntaxError(text, `chu kỳ tối đa ${BLINK_MAX_PERIOD_S} giây để đo được 3 lần trong cửa sổ 5 giây`)
    }
    return {
      kind: 'blink',
      target: upper(m[1]),
      periodS,
      tolerance: m[3] ? num(m[3]) / 100 : DEFAULT_BLINK_TOLERANCE,
    }
  }
  if ((m = /^(m[1-4]) (tiến|lùi|dừng)$/.exec(t))) {
    const state = m[2] === 'tiến' ? 'forward' : m[2] === 'lùi' ? 'backward' : 'stop'
    return { kind: 'motor', target: upper(m[1]), state }
  }
  if ((m = new RegExp(String.raw`^(m[1-4]) tốc độ ≥ ${NUMBER}$`).exec(t))) {
    return { kind: 'motorSpeed', target: upper(m[1]), minPercent: num(m[2]) }
  }
  if ((m = new RegExp(String.raw`^servo (s[1-5]) ở ${NUMBER} độ(?: ± ${NUMBER})?$`).exec(t))) {
    return {
      kind: 'servo',
      target: upper(m[1]),
      angle: num(m[2]),
      tolerance: m[3] ? num(m[3]) : DEFAULT_SERVO_TOLERANCE,
    }
  }
  // The quoted text keeps the author's casing: it is what the learner should see on the screen.
  if ((m = /^oled\s+hiện\s+(đúng\s+)?"(.+)"$/i.exec(text.normalize('NFC').trim())))
    return { kind: 'oled', text: m[2], exact: Boolean(m[1]) }

  throw new RuleSyntaxError(
    text,
    'các dạng được hiểu: "L1 sáng/tắt", "còi kêu/tắt", "L1 nhấp nháy, chu kỳ X giây ± Y%", ' +
      '"M1 tiến/lùi/dừng", "M1 tốc độ ≥ N", "servo S1 ở G độ ± D", \'OLED hiện "…"\', \'OLED hiện đúng "…"\'',
  )
}
