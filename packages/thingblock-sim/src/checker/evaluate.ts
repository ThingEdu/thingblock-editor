// packages/thingblock-sim/src/checker/evaluate.ts
/**
 * Grade lesson rules against what the virtual hardware logged. Messages are for the learner: they say
 * what the board did, never "wrong".
 */
import type { LogEntry } from '../runtime'
import type { LightName, MotorName, Rule } from './rules'
import { BUZZER_CHANNEL, dutyToAngle, LIGHT_CHANNEL, MOTOR_CHANNELS, SERVO_CHANNEL } from './thingbot-map'

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

// The motor's state after each A/B channel write, in time order.
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
    const state: MotorState = dutyA > 0 && dutyB === 0 ? 'forward' : dutyB > 0 && dutyA === 0 ? 'backward' : 'stop'
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
  if (peak === 0) return fail(`Động cơ ${target} chưa chạy. Bài cần ít nhất ${minPercent}%.`)
  return fail(`Động cơ ${target} chạy mạnh nhất khoảng ${percent}%. Bài cần ít nhất ${minPercent}%.`)
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
  return fail(`Servo ${target} đang ở ${seen} độ. Bài cần khoảng ${angle} độ.`)
}

const checkOled = (text: string, exact: boolean, log: readonly LogEntry[]): RuleResult => {
  let shown = ''
  for (const e of log) if (e.dev === 'oled' && e.key === 'text') shown = String(e.value)
  const hit = exact
    ? shown.split('\n').some((line) => line.trim() === text.trim())
    : shown.toLowerCase().includes(text.toLowerCase())
  return hit ? PASS : fail(`Màn hình chưa hiện chữ "${text}".`)
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
        return checkOled(rule.text, rule.exact, log)
    }
  })
}
