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
  | { kind: 'oled'; text: string; exact: boolean; y?: number; size?: { w: number; h: number } }
  | { kind: 'servoSweep'; target: ServoName; from: number; to: number; tolerance: number }
  | { kind: 'switch'; held: boolean }
  | { kind: 'distance'; op: DistanceOp; cm: number }
  | { kind: 'ps2'; button: string }
  | CameraRule

/**
 * Rules about the Camera AI playground. They are graded in the editor against what the playground shows,
 * not in the simulator, so a step's rules are all of this kind or none of it.
 */
export type CameraRule =
  | { kind: 'cameraOn' }
  | { kind: 'handSeen' }
  | { kind: 'gesture'; gesture: CameraGesture }
  | { kind: 'object'; name: string }
  | { kind: 'touch'; name: string; part: HandPart }
  | { kind: 'score'; player: 1 | 2; op: CompareOp; n: number }
  | { kind: 'say'; text: string }

export type DistanceOp = '<' | '≤' | '>' | '≥'
export type CompareOp = DistanceOp | '='
export type CameraGesture = 'fist' | 'open' | 'victory' | 'point_up' | 'thumb_up' | 'thumb_down' | 'i_love_you'
export type HandPart = 'indexTip' | 'palm' | 'wrist'

export const CAMERA_RULE_KINDS: readonly string[] = [
  'cameraOn',
  'handSeen',
  'gesture',
  'object',
  'touch',
  'score',
  'say',
]

export const isCameraRule = (rule: Rule): rule is CameraRule => CAMERA_RULE_KINDS.includes(rule.kind)

/** Gestures a lesson names after `tay`, by their Vietnamese name, to the value the blocks report. */
export const CAMERA_GESTURES: Record<string, CameraGesture> = {
  nắm: 'fist',
  xòe: 'open',
  xoè: 'open',
  'chữ v': 'victory',
  'chỉ lên': 'point_up',
  'giơ ngón cái': 'thumb_up',
  'chúc ngón cái': 'thumb_down',
  'i love you': 'i_love_you',
}

/** Hand parts a lesson names after `chạm`, to the part the blocks use. */
export const HAND_PARTS: Record<string, HandPart> = {
  'ngón trỏ': 'indexTip',
  'lòng bàn tay': 'palm',
  'cổ tay': 'wrist',
}

/** Words a lesson may name a PS2 button by: the pad's symbol or a Vietnamese name, to the PS2X constant. */
export const PS2_BUTTONS: Record<string, string> = {
  lên: 'PSB_PAD_UP',
  '▲': 'PSB_PAD_UP',
  xuống: 'PSB_PAD_DOWN',
  '▼': 'PSB_PAD_DOWN',
  trái: 'PSB_PAD_LEFT',
  '◀': 'PSB_PAD_LEFT',
  phải: 'PSB_PAD_RIGHT',
  '▶': 'PSB_PAD_RIGHT',
  'tam giác': 'PSB_TRIANGLE',
  '△': 'PSB_TRIANGLE',
  tròn: 'PSB_CIRCLE',
  '○': 'PSB_CIRCLE',
  nhân: 'PSB_CROSS',
  '✕': 'PSB_CROSS',
  vuông: 'PSB_SQUARE',
  '□': 'PSB_SQUARE',
  l1: 'PSB_L1',
  l2: 'PSB_L2',
  r1: 'PSB_R1',
  r2: 'PSB_R2',
  select: 'PSB_SELECT',
  start: 'PSB_START',
}

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
    .replace(/<=/g, '≤')
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
  if ((m = new RegExp(String.raw`^(m[1-4]) tốc độ ≥ ${NUMBER}%?$`).exec(t))) {
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
  if ((m = new RegExp(String.raw`^servo (s[1-5]) quét từ ${NUMBER} đến ${NUMBER} độ(?: ± ${NUMBER})?$`).exec(t))) {
    const from = num(m[2])
    const to = num(m[3])
    if (from === to) throw new RuleSyntaxError(text, 'hai góc quét phải khác nhau')
    return {
      kind: 'servoSweep',
      target: upper(m[1]),
      from: Math.min(from, to),
      to: Math.max(from, to),
      tolerance: m[4] ? num(m[4]) : DEFAULT_SERVO_TOLERANCE,
    }
  }
  if ((m = /^(giữ|nhả) nút sw$/.exec(t))) return { kind: 'switch', held: m[1] === 'giữ' }
  if ((m = new RegExp(String.raw`^khoảng cách ?(<|≤|>|≥) ?${NUMBER} ?cm$`).exec(t))) {
    return { kind: 'distance', op: m[1] as DistanceOp, cm: num(m[2]) }
  }
  if ((m = /^giữ nút ps2 (.+)$/.exec(t))) {
    const button = PS2_BUTTONS[m[1]]
    if (!button) throw new RuleSyntaxError(text, `nút PS2 được hiểu: ${Object.keys(PS2_BUTTONS).join(', ')}`)
    return { kind: 'ps2', button }
  }
  if (t === 'camera bật') return { kind: 'cameraOn' }
  if (t === 'thấy bàn tay') return { kind: 'handSeen' }
  if ((m = /^tay (.+)$/.exec(t))) {
    const gesture = CAMERA_GESTURES[m[1]] as CameraGesture | undefined
    if (!gesture) throw new RuleSyntaxError(text, `cử chỉ được hiểu: ${Object.keys(CAMERA_GESTURES).join(', ')}`)
    return { kind: 'gesture', gesture }
  }
  if ((m = new RegExp(String.raw`^điểm người chơi ([12]) ?(<|≤|>|≥|=) ?(-?\d+)$`).exec(t))) {
    return { kind: 'score', player: m[1] === '1' ? 1 : 2, op: m[2] as CompareOp, n: Number(m[3]) }
  }
  // Object names and spoken text keep the author's casing: they are what the program writes.
  const quoted = text.normalize('NFC').trim()
  if ((m = /^sân chơi có\s+"(.+)"$/i.exec(quoted))) return { kind: 'object', name: m[1] }
  if ((m = /^sân chơi nói\s+"(.+)"$/i.exec(quoted))) return { kind: 'say', text: m[1] }
  if ((m = /^"(.+)"\s+chạm\s+(.+)$/i.exec(quoted))) {
    const part = HAND_PARTS[normalize(m[2])] as HandPart | undefined
    if (!part) throw new RuleSyntaxError(text, `bộ phận được hiểu: ${Object.keys(HAND_PARTS).join(', ')}`)
    return { kind: 'touch', name: m[1], part }
  }
  // The quoted text keeps the author's casing: it is what the learner should see on the screen.
  // Optional placement after the quote: `ở y 16` (the line the text starts on, in pixels) and
  // `cỡ 12x16` (the glyph cell the text size block names).
  if (
    (m = /^oled\s+hiện\s+(đúng\s+)?"(.+)"(?:\s+ở\s+y\s*=?\s*(\d+))?(?:\s+cỡ\s+(\d+)\s*x\s*(\d+))?$/i.exec(
      text.normalize('NFC').trim(),
    ))
  ) {
    // Optional groups that did not take part in the match are undefined.
    const [, exact, quoted, y, w, h] = m as (string | undefined)[]
    return {
      kind: 'oled',
      text: quoted ?? '',
      exact: Boolean(exact),
      ...(y === undefined ? {} : { y: Number(y) }),
      ...(w === undefined ? {} : { size: { w: Number(w), h: Number(h) } }),
    }
  }

  throw new RuleSyntaxError(
    text,
    'các dạng được hiểu: "L1 sáng/tắt", "còi kêu/tắt", "L1 nhấp nháy, chu kỳ X giây ± Y%", ' +
      '"M1 tiến/lùi/dừng", "M1 tốc độ ≥ N%", "servo S1 ở G độ ± D", "servo S1 quét từ A đến B độ", ' +
      '\'OLED hiện "…"\', \'OLED hiện đúng "…"\', \'OLED hiện "…" ở y N cỡ 12x16\', ' +
      '"giữ/nhả nút SW", "khoảng cách < N cm", "giữ nút PS2 lên"; Camera AI: "camera bật", "thấy bàn tay", ' +
      '"tay nắm", \'sân chơi có "tên"\', \'"tên" chạm ngón trỏ\', "điểm người chơi 1 ≥ N", \'sân chơi nói "…"\'',
  )
}
