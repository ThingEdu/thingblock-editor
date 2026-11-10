// packages/thingblock-sim/src/checker/evaluate.ts
/**
 * Grade lesson rules against what the virtual hardware logged. Messages are for the learner: they say
 * what the board did, never "wrong".
 */
import { ballByReading, BELT_INPUT, IR_DARK, IR_INPUT } from '../hal/rig'
import { DEFAULT_DISTANCE_CM, DISTANCE_INPUT, ps2Input } from '../hal/sensors'
import type { LogEntry } from '../runtime'
import type { DistanceOp, LightName, MotorName, Rule, ServoName } from './rules'
import {
  BUZZER_CHANNEL,
  dutyToAngle,
  LIGHT_CHANNEL,
  MOTOR_CHANNELS,
  PS2_SYMBOL,
  SERVO_CHANNEL,
  SWITCH_GPIO,
} from './thingbot-map'

export interface RuleResult {
  ok: boolean
  /** Why the rule did not pass, for the learner; empty when it did. */
  message: string
}

const PASS: RuleResult = { ok: true, message: '' }
const fail = (message: string): RuleResult => ({ ok: false, message })
const MIN_BLINK_OFFS = 3

interface DutyEvent {
  t: number
  duty: number
}

const dutyHistory = (log: readonly LogEntry[], channel: number): DutyEvent[] => {
  const key = `ch${channel}`
  const history: DutyEvent[] = []
  for (const e of log) if (e.dev === 'pca9685' && e.key === key) history.push({ t: e.t, duty: Number(e.value) })
  return history
}
const lastDuty = (history: DutyEvent[]): number => (history.length ? history[history.length - 1].duty : 0)

// Vietnamese number with a decimal comma and at most one decimal, e.g. 0,5 or 1.
const vnSeconds = (s: number): string => (Math.round(s * 10) / 10).toString().replace('.', ',')

const checkLight = (target: LightName, on: boolean, log: readonly LogEntry[]): RuleResult => {
  const lit = lastDuty(dutyHistory(log, LIGHT_CHANNEL[target])) > 0
  if (lit === on) return PASS
  return on ? fail(`Đèn ${target} chưa sáng.`) : fail(`Đèn ${target} đang sáng. Bài cần ${target} tắt.`)
}

const checkBuzzer = (on: boolean, log: readonly LogEntry[]): RuleResult => {
  const history = dutyHistory(log, BUZZER_CHANNEL)
  if (on) return history.some((e) => e.duty > 0) ? PASS : fail('Còi chưa kêu.')
  return lastDuty(history) === 0 ? PASS : fail('Còi đang kêu. Bài cần còi tắt.')
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const checkBlink = (target: LightName, periodS: number, tolerance: number, log: readonly LogEntry[]): RuleResult => {
  const history = dutyHistory(log, LIGHT_CHANNEL[target])
  const onTimes: number[] = []
  let offs = 0
  let wasOn = false
  for (const e of history) {
    const isOn = e.duty > 0
    if (isOn && !wasOn) onTimes.push(e.t)
    if (!isOn && wasOn) offs++
    wasOn = isOn
  }
  if (offs < MIN_BLINK_OFFS) {
    return fail(`Đèn ${target} chưa nhấp nháy đủ: cần bật rồi tắt ít nhất ${MIN_BLINK_OFFS} lần.`)
  }
  const periods = onTimes.slice(1).map((t, i) => (t - onTimes[i]) / 1_000_000)
  const seen = median(periods)
  if (Math.abs(seen - periodS) <= periodS * tolerance) return PASS
  return fail(
    `Đèn ${target} có nhấp nháy, nhưng mỗi lần khoảng ${vnSeconds(seen)} giây. Bài cần khoảng ${vnSeconds(periodS)} giây.`,
  )
}

type MotorState = 'forward' | 'backward' | 'stop'

// The motor's state after each A/B channel write, in time order. `set motor … forward` drives B and
// grounds A (the same in the sketch, the live firmware and the simulator), backward the other way round.
const motorStates = (target: MotorName, log: readonly LogEntry[]): { state: MotorState; duty: number }[] => {
  const { a, b } = MOTOR_CHANNELS[target]
  const keyA = `ch${a}`
  const keyB = `ch${b}`
  let dutyA = 0
  let dutyB = 0
  const states: { state: MotorState; duty: number }[] = []
  for (const e of log) {
    if (e.dev !== 'pca9685' || (e.key !== keyA && e.key !== keyB)) continue
    if (e.key === keyA) dutyA = Number(e.value)
    else dutyB = Number(e.value)
    const state: MotorState = dutyB > 0 && dutyA === 0 ? 'forward' : dutyA > 0 && dutyB === 0 ? 'backward' : 'stop'
    states.push({ state, duty: Math.max(dutyA, dutyB) })
  }
  return states
}

const motorWord = (state: MotorState): string =>
  state === 'forward' ? 'tiến' : state === 'backward' ? 'lùi' : 'dừng'

const checkMotor = (target: MotorName, wanted: MotorState, log: readonly LogEntry[]): RuleResult => {
  const states = motorStates(target, log)
  const last = states.length ? states[states.length - 1].state : 'stop'
  if (wanted === 'stop')
    return last === 'stop' ? PASS : fail(`Động cơ ${target} vẫn đang chạy. Bài cần ${target} dừng.`)
  if (states.some((s) => s.state === wanted)) return PASS
  const seen = states.find((s) => s.state !== 'stop')
  if (!seen) return fail(`Động cơ ${target} chưa chạy. Bài cần ${target} ${motorWord(wanted)}.`)
  return fail(`Động cơ ${target} đang ${motorWord(seen.state)}. Bài cần ${target} ${motorWord(wanted)}.`)
}

const checkMotorSpeed = (target: MotorName, minPercent: number, log: readonly LogEntry[]): RuleResult => {
  const peak = Math.max(0, ...motorStates(target, log).map((s) => s.duty))
  const percent = Math.round((peak / 4095) * 100)
  if (percent >= minPercent) return PASS
  if (peak === 0) return fail(`Động cơ ${target} chưa chạy. Bài cần ít nhất ${minPercent}% tốc độ.`)
  return fail(`Động cơ ${target} chạy nhanh nhất khoảng ${percent}% tốc độ. Bài cần ít nhất ${minPercent}% tốc độ.`)
}

const checkServo = (
  target: keyof typeof SERVO_CHANNEL,
  angle: number,
  tolerance: number,
  log: readonly LogEntry[],
): RuleResult => {
  const history = dutyHistory(log, SERVO_CHANNEL[target])
  if (!history.length) return fail(`Servo ${target} chưa được đặt góc.`)
  const seen = dutyToAngle(lastDuty(history))
  if (Math.abs(seen - angle) <= tolerance) return PASS
  return fail(`Servo ${target} đang ở góc ${seen}°. Bài cần góc khoảng ${angle}°.`)
}

interface TextSpan {
  t: string
  x: number
  y: number
  w: number
  h: number
}

const checkOled = (
  rule: { text: string; exact: boolean; y?: number; size?: { w: number; h: number } },
  log: readonly LogEntry[],
): RuleResult => {
  let shown = ''
  let spans: TextSpan[] = []
  for (const e of log) {
    if (e.dev !== 'oled') continue
    if (e.key === 'text') shown = String(e.value)
    else if (e.key === 'textAt') spans = JSON.parse(String(e.value)) as TextSpan[]
  }
  const { text, exact } = rule
  const matches = (s: string) =>
    exact ? s.split('\n').some((line) => line.trim() === text.trim()) : s.toLowerCase().includes(text.toLowerCase())
  if (!matches(shown)) return fail(`Màn hình chưa hiện chữ "${text}".`)
  if (rule.y === undefined && !rule.size) return PASS
  const placed = spans.filter((span) => matches(span.t))
  if (rule.y !== undefined && !placed.some((span) => span.y === rule.y)) {
    return fail(`Chữ "${text}" chưa nằm ở dòng y = ${rule.y}. Đặt con trỏ trước khi in.`)
  }
  const size = rule.size
  if (size && !placed.some((span) => span.w === size.w && span.h === size.h)) {
    return fail(`Chữ "${text}" chưa ở cỡ chữ ${size.w}×${size.h}.`)
  }
  return PASS
}

const checkServoSweep = (
  target: ServoName,
  from: number,
  to: number,
  tolerance: number,
  log: readonly LogEntry[],
): RuleResult => {
  const angles = dutyHistory(log, SERVO_CHANNEL[target]).map((e) => dutyToAngle(e.duty))
  if (!angles.length) return fail(`Servo ${target} chưa được đặt góc.`)
  const low = Math.min(...angles)
  const high = Math.max(...angles)
  if (low <= from + tolerance && high >= to - tolerance) return PASS
  return fail(`Servo ${target} mới quay trong khoảng ${low}° đến ${high}°. Bài cần quét từ ${from}° đến ${to}°.`)
}

/**
 * The last value the rig drove onto an input (the learner's switch, slider or pad).
 * @param log The session's event log.
 * @param key The input, e.g. `gpio3` or `ultrasonic`.
 * @returns Its last value, undefined if the rig never set it.
 */
const lastInput = (log: readonly LogEntry[], key: string): number | undefined => {
  let value: number | undefined
  for (const e of log) if (e.dev === 'input' && e.key === key) value = Number(e.value)
  return value
}

const checkSwitch = (held: boolean, log: readonly LogEntry[]): RuleResult => {
  // Active low, and pulled up while nobody touches it.
  const pressed = (lastInput(log, `gpio${SWITCH_GPIO}`) ?? 1) === 0
  if (pressed === held) return PASS
  return held ? fail('Em hãy giữ nút SW trên mạch ảo.') : fail('Em hãy nhả nút SW ra.')
}

const DISTANCE_TEST: Record<DistanceOp, (seen: number, cm: number) => boolean> = {
  '<': (seen, cm) => seen < cm,
  '≤': (seen, cm) => seen <= cm,
  '>': (seen, cm) => seen > cm,
  '≥': (seen, cm) => seen >= cm,
}

const checkDistance = (op: DistanceOp, cm: number, log: readonly LogEntry[]): RuleResult => {
  const seen = lastInput(log, DISTANCE_INPUT) ?? DEFAULT_DISTANCE_CM
  if (DISTANCE_TEST[op](seen, cm)) return PASS
  const near = op === '<' || op === '≤'
  return fail(
    `Vật đang cách cảm biến ${seen} cm. Bước này cần vật ${near ? 'gần' : 'xa'} hơn ${cm} cm: ` +
      `kéo thanh khoảng cách ${near ? 'xuống' : 'lên'}.`,
  )
}

const checkPs2 = (button: string, log: readonly LogEntry[]): RuleResult =>
  (lastInput(log, ps2Input(button)) ?? 0) !== 0
    ? PASS
    : fail(`Em hãy giữ nút ${PS2_SYMBOL[button] ?? button} trên tay cầm PS2 ảo.`)

const checkBall = (dark: boolean, log: readonly LogEntry[]): RuleResult => {
  const reading = lastInput(log, IR_INPUT)
  const ball = reading === undefined ? undefined : ballByReading(reading)
  if (ball && ball.ir < IR_DARK === dark) return PASS
  return dark
    ? fail('Em hãy đặt một quả bóng tối màu (xanh dương hoặc đen) trước mắt hồng ngoại: chọn ở thanh Bóng.')
    : fail('Em hãy đặt một quả bóng sáng màu (trắng, vàng hoặc đỏ) trước mắt hồng ngoại: chọn ở thanh Bóng.')
}

const checkIrRead = (pin: number, log: readonly LogEntry[]): RuleResult => {
  const read = new Set(log.filter((e) => e.dev === 'read').map((e) => e.key))
  if (read.has(`adc${pin}`)) return PASS
  const other = [...read].map((key) => /^adc(\d+)$/.exec(key)?.[1]).find((p) => p !== undefined)
  if (other !== undefined) {
    return fail(`Chương trình đang đọc chân IO${other}. Mắt hồng ngoại cắm ở IO${pin}.`)
  }
  return fail(`Chương trình chưa đọc mắt hồng ngoại ở IO${pin}.`)
}

/**
 * Each egg the belt sorted, in order.
 * @param log The session's event log.
 * @returns Whether each went to the right bin, which bin, and whether it was bad.
 */
const sortedEggs = (log: readonly LogEntry[]): { right: boolean; fate: string; bad: boolean }[] =>
  log
    .filter((e) => e.dev === 'belt')
    .map((e) => {
      const bad = e.value === 'bad'
      return { right: (e.key === 'reject') === bad, fate: e.key, bad }
    })

const NO_BELT = 'Mạch ảo chưa có băng chuyền trứng trước mắt hồng ngoại.'

const checkSorted = (streak: number, log: readonly LogEntry[]): RuleResult => {
  if (!lastInput(log, BELT_INPUT)) return fail(NO_BELT)
  const eggs = sortedEggs(log)
  if (!eggs.length) {
    return fail('Chưa có quả trứng nào tới cần gạt hay cuối băng. Động cơ M1 phải chạy tiến để kéo băng chuyền.')
  }
  let run = 0
  while (run < eggs.length && eggs[eggs.length - 1 - run].right) run++
  if (run >= streak) return PASS
  const mistake = eggs.slice(0, eggs.length - run).pop()
  const why = !mistake
    ? ''
    : mistake.bad
      ? ' Quả sai gần nhất: trứng hỏng lọt vào thùng trứng tốt.'
      : ' Quả sai gần nhất: trứng tốt bị gạt vào thùng loại.'
  return fail(`Mới có ${run} quả trứng liền nhau vào đúng thùng. Bài cần ${streak} quả.${why}`)
}

const checkRejected = (count: number, log: readonly LogEntry[]): RuleResult => {
  if (!lastInput(log, BELT_INPUT)) return fail(NO_BELT)
  const rejected = sortedEggs(log).filter((e) => e.bad && e.fate === 'reject').length
  if (rejected >= count) return PASS
  return fail(`Cần gạt mới đẩy được ${rejected} quả trứng hỏng vào thùng loại. Bài cần ${count} quả.`)
}

export function evaluateLogRules(rules: readonly Rule[], log: readonly LogEntry[]): RuleResult[] {
  return rules.map((rule) => {
    switch (rule.kind) {
      case 'light':
        return checkLight(rule.target, rule.on, log)
      case 'buzzer':
        return checkBuzzer(rule.on, log)
      case 'blink':
        return checkBlink(rule.target, rule.periodS, rule.tolerance, log)
      case 'motor':
        return checkMotor(rule.target, rule.state, log)
      case 'motorSpeed':
        return checkMotorSpeed(rule.target, rule.minPercent, log)
      case 'servo':
        return checkServo(rule.target, rule.angle, rule.tolerance, log)
      case 'oled':
        return checkOled(rule, log)
      case 'servoSweep':
        return checkServoSweep(rule.target, rule.from, rule.to, rule.tolerance, log)
      case 'switch':
        return checkSwitch(rule.held, log)
      case 'distance':
        return checkDistance(rule.op, rule.cm, log)
      case 'ps2':
        return checkPs2(rule.button, log)
      case 'ball':
        return checkBall(rule.dark, log)
      case 'irRead':
        return checkIrRead(rule.pin, log)
      case 'sorted':
        return checkSorted(rule.streak, log)
      case 'rejected':
        return checkRejected(rule.count, log)
      default:
        // Camera AI rules are graded in the editor against the playground; the simulator never sees them.
        return fail('Luật này chấm trên Sân chơi Camera AI, không trên mạch ảo.')
    }
  })
}
