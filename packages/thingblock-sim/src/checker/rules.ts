/**
 * The rule vocabulary a lesson author writes after `check:`. Parsed once at pack build time (Node) and
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
  | { kind: 'ball'; dark: boolean }
  | { kind: 'irRead'; pin: number }
  | { kind: 'sorted'; streak: number }
  | { kind: 'rejected'; count: number }
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
  | { kind: 'headSeen' }
  | { kind: 'headTilt'; dir: 'left' | 'right' | 'straight' }
  | { kind: 'motion'; motion: 'flap' | 'nod' }

export type DistanceOp = '<' | '≤' | '>' | '≥'
export type CompareOp = DistanceOp | '='
export type CameraGesture = 'fist' | 'open' | 'victory' | 'point_up' | 'thumb_up' | 'thumb_down' | 'i_love_you'
export type HandPart = 'indexTip' | 'palm' | 'wrist' | 'head'

export const CAMERA_RULE_KINDS: readonly string[] = [
  'cameraOn',
  'handSeen',
  'gesture',
  'object',
  'touch',
  'score',
  'say',
  'headSeen',
  'headTilt',
  'motion',
]

export const isCameraRule = (rule: Rule): rule is CameraRule => CAMERA_RULE_KINDS.includes(rule.kind)

/** Gestures a lesson names after `hand`, to the value the blocks report. */
export const CAMERA_GESTURES: Record<string, CameraGesture> = {
  fist: 'fist',
  open: 'open',
  victory: 'victory',
  'point up': 'point_up',
  'thumb up': 'thumb_up',
  'thumb down': 'thumb_down',
  'i love you': 'i_love_you',
}

/** Parts a lesson names after `touches`, to the part the blocks use. */
export const HAND_PARTS: Record<string, HandPart> = {
  'index finger': 'indexTip',
  palm: 'palm',
  wrist: 'wrist',
  head: 'head',
}

/** Words a lesson may name a PS2 button by: the pad's symbol or its English name, to the PS2X constant. */
export const PS2_BUTTONS: Record<string, string> = {
  up: 'PSB_PAD_UP',
  '▲': 'PSB_PAD_UP',
  down: 'PSB_PAD_DOWN',
  '▼': 'PSB_PAD_DOWN',
  left: 'PSB_PAD_LEFT',
  '◀': 'PSB_PAD_LEFT',
  right: 'PSB_PAD_RIGHT',
  '▶': 'PSB_PAD_RIGHT',
  triangle: 'PSB_TRIANGLE',
  '△': 'PSB_TRIANGLE',
  circle: 'PSB_CIRCLE',
  '○': 'PSB_CIRCLE',
  cross: 'PSB_CROSS',
  '✕': 'PSB_CROSS',
  square: 'PSB_SQUARE',
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
    super(`Cannot parse rule "${input}": ${detail}`)
    this.name = 'RuleSyntaxError'
    this.input = input
  }
}

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`
const num = (s: string): number => Number(s.replace(',', '.'))
const upper = <T extends string>(s: string): T => s.toUpperCase() as T

// Lower-case, NFC, single spaces, no space before `%`, and `>=` spelled `≥`. A decimal comma is
// accepted as well as a point.
const normalize = (text: string): string =>
  text
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ %/g, '%')
    .replace(/>=/g, '≥')
    .replace(/<=/g, '≤')
    .replace(/\+-|\+\/-/g, '±')
    .trim()

export function parseRule(text: string): Rule {
  const t = normalize(text)
  let m: RegExpExecArray | null

  if ((m = /^(l[12]) (on|off)$/.exec(t))) return { kind: 'light', target: upper(m[1]), on: m[2] === 'on' }
  if ((m = /^buzzer (on|off)$/.exec(t))) return { kind: 'buzzer', on: m[1] === 'on' }
  if ((m = new RegExp(String.raw`^(l[12]) blinks every ${NUMBER} ?s(?: ± ${NUMBER}%)?$`).exec(t))) {
    const periodS = num(m[2])
    if (periodS > BLINK_MAX_PERIOD_S) {
      throw new RuleSyntaxError(
        text,
        `the period can be at most ${BLINK_MAX_PERIOD_S} s to be seen 3 times in the 5 s window`,
      )
    }
    return {
      kind: 'blink',
      target: upper(m[1]),
      periodS,
      tolerance: m[3] ? num(m[3]) / 100 : DEFAULT_BLINK_TOLERANCE,
    }
  }
  if ((m = /^(m[1-4]) (forward|backward|stop)$/.exec(t))) {
    return { kind: 'motor', target: upper(m[1]), state: m[2] as 'forward' | 'backward' | 'stop' }
  }
  if ((m = new RegExp(String.raw`^(m[1-4]) speed ≥ ${NUMBER}%?$`).exec(t))) {
    return { kind: 'motorSpeed', target: upper(m[1]), minPercent: num(m[2]) }
  }
  if ((m = new RegExp(String.raw`^servo (s[1-5]) at ${NUMBER} deg(?: ± ${NUMBER})?$`).exec(t))) {
    return {
      kind: 'servo',
      target: upper(m[1]),
      angle: num(m[2]),
      tolerance: m[3] ? num(m[3]) : DEFAULT_SERVO_TOLERANCE,
    }
  }
  if (
    (m = new RegExp(String.raw`^servo (s[1-5]) sweeps from ${NUMBER} to ${NUMBER} deg(?: ± ${NUMBER})?$`).exec(t))
  ) {
    const from = num(m[2])
    const to = num(m[3])
    if (from === to) throw new RuleSyntaxError(text, 'the two sweep angles must differ')
    return {
      kind: 'servoSweep',
      target: upper(m[1]),
      from: Math.min(from, to),
      to: Math.max(from, to),
      tolerance: m[4] ? num(m[4]) : DEFAULT_SERVO_TOLERANCE,
    }
  }
  if ((m = /^(hold|release) sw$/.exec(t))) return { kind: 'switch', held: m[1] === 'hold' }
  if ((m = new RegExp(String.raw`^distance ?(<|≤|>|≥) ?${NUMBER} ?cm$`).exec(t))) {
    return { kind: 'distance', op: m[1] as DistanceOp, cm: num(m[2]) }
  }
  if ((m = /^hold ps2 (.+)$/.exec(t))) {
    const button = PS2_BUTTONS[m[1]]
    if (!button) throw new RuleSyntaxError(text, `known PS2 buttons: ${Object.keys(PS2_BUTTONS).join(', ')}`)
    return { kind: 'ps2', button }
  }
  if ((m = /^pick (dark|bright) ball$/.exec(t))) return { kind: 'ball', dark: m[1] === 'dark' }
  if ((m = /^read ir eye io ?(\d+)$/.exec(t))) return { kind: 'irRead', pin: Number(m[1]) }
  if ((m = /^sort (\d+) eggs? in a row$/.exec(t))) {
    const streak = Number(m[1])
    if (streak < 1) throw new RuleSyntaxError(text, 'needs at least 1 egg')
    return { kind: 'sorted', streak }
  }
  if ((m = /^reject (\d+) bad eggs?$/.exec(t))) return { kind: 'rejected', count: Number(m[1]) }
  if (t === 'camera on') return { kind: 'cameraOn' }
  if (t === 'hand seen') return { kind: 'handSeen' }
  if (t === 'head seen') return { kind: 'headSeen' }
  if ((m = /^head tilts (left|right|straight)$/.exec(t))) {
    return { kind: 'headTilt', dir: m[1] as 'left' | 'right' | 'straight' }
  }
  if (t === 'arms flap') return { kind: 'motion', motion: 'flap' }
  if (t === 'head nods') return { kind: 'motion', motion: 'nod' }
  if ((m = /^hand (.+)$/.exec(t))) {
    const gesture = CAMERA_GESTURES[m[1]] as CameraGesture | undefined
    if (!gesture) throw new RuleSyntaxError(text, `known gestures: ${Object.keys(CAMERA_GESTURES).join(', ')}`)
    return { kind: 'gesture', gesture }
  }
  if ((m = new RegExp(String.raw`^player ([12]) score ?(<|≤|>|≥|=) ?(-?\d+)$`).exec(t))) {
    return { kind: 'score', player: m[1] === '1' ? 1 : 2, op: m[2] as CompareOp, n: Number(m[3]) }
  }
  // Object names and spoken text keep the author's casing: they are what the program writes.
  const quoted = text.normalize('NFC').trim()
  if ((m = /^playground has\s+"(.+)"$/i.exec(quoted))) return { kind: 'object', name: m[1] }
  if ((m = /^playground says\s+"(.+)"$/i.exec(quoted))) return { kind: 'say', text: m[1] }
  if ((m = /^"(.+)"\s+touches\s+(.+)$/i.exec(quoted))) {
    const part = HAND_PARTS[normalize(m[2])] as HandPart | undefined
    if (!part) throw new RuleSyntaxError(text, `known parts: ${Object.keys(HAND_PARTS).join(', ')}`)
    return { kind: 'touch', name: m[1], part }
  }
  // The quoted text keeps the author's casing: it is what the learner should see on the screen.
  // Optional placement after the quote: `at y 16` (the line the text starts on, in pixels) and
  // `size 12x16` (the glyph cell the text size block names).
  if (
    (m = /^oled\s+shows\s+(exactly\s+)?"(.+)"(?:\s+at\s+y\s*=?\s*(\d+))?(?:\s+size\s+(\d+)\s*x\s*(\d+))?$/i.exec(
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
    'known forms: "L1 on/off", "buzzer on/off", "L1 blinks every X s ± Y%", ' +
      '"M1 forward/backward/stop", "M1 speed ≥ N%", "servo S1 at A deg ± D", "servo S1 sweeps from A to B deg", ' +
      '\'OLED shows "…"\', \'OLED shows exactly "…"\', \'OLED shows "…" at y N size 12x16\', ' +
      '"hold/release SW", "distance < N cm", "hold PS2 up", "pick dark/bright ball", "read IR eye IO4", ' +
      '"sort N eggs in a row", "reject N bad eggs"; Camera AI: "camera on", "hand seen", "hand fist", ' +
      '\'playground has "name"\', \'"name" touches index finger\', "player 1 score ≥ N", ' +
      '\'playground says "…"\', "head seen", "head tilts left/right/straight", \'"name" touches head\', ' +
      '"arms flap", "head nods"',
  )
}
