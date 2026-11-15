/**
 * The IR eye on IO4 and the egg belt in front of it (logic from ThingEdu/thingbot-sim `src/belt.ts`, bde12a2):
 * the board feeds the belt's reading to `analogRead(4)`, moves the belt with M1, and lets servo S1's gate push
 * eggs into the reject bin.
 */
import { describe, expect, it } from 'vitest'
import { createBoard } from '../src/board'
import { evaluateLogRules } from '../src/checker/evaluate'
import { parseRule } from '../src/checker/rules'
import { BAD_EGG_IR, Belt, BELT_IR, GOOD_EGG_IR } from '../src/hal/rig'
import { Session } from '../src/session'

/**
 * A sorter as the simulator generator writes it: M1 forward at 40 %, gate down while the eye sees dark.
 * @param gateDown The duty servo S1 gets for a dark reading.
 * @param waitMs The wait at the end of each loop.
 * @returns The simulator code.
 */
const sorter = (gateDown: number, waitMs = 50) => `
const pwm = $.hw.Adafruit_PWMServoDriver();
function* setup() {
  yield "init"; pwm.begin(); pwm.setPWMFreq(50);
  yield "motor"; pwm.setPWM(2, 0, 0); pwm.setPWM(3, 0, 1638);
  yield "servo"; pwm.setPWM(12, 0, 102);
}
function* loop() {
  yield "if";
  if ($.analogRead(4) < 1500) { yield "down"; pwm.setPWM(12, 0, ${gateDown}); }
  else { yield "up"; pwm.setPWM(12, 0, 102); }
  yield "wait"; yield $.delay(${waitMs});
}
return { setup, loop };
`
/** Duty for 90° and 0° on servo S1, as `servoSetAngle` maps them. */
const DOWN = 307
const UP = 102

const run = (code: string, seconds: number, belt = true) => {
  const session = new Session(code, { now: () => 0 })
  if (belt) session.setInput('belt', 1)
  session.running = true
  let snapshot = session.snapshot()
  while (snapshot.t < seconds * 1e6) snapshot = session.tick(16)
  return { session, snapshot }
}
const grade = (rules: string[], session: Session) =>
  evaluateLogRules(
    rules.map((r) => parseRule(r)),
    session.log,
  )

describe('Belt', () => {
  it('stands still below the motor dead band and reads the bare belt', () => {
    const belt = new Belt()
    expect(belt.step(0.1, null, 1)).toEqual([])
    expect(belt.state().moved).toBe(0)
    expect(belt.ir).toBe(BELT_IR)
  })

  it('passes every egg into the good bin with the gate up, and the eye sees each one on the way', () => {
    const belt = new Belt()
    const seen = new Set<number>()
    const fates = []
    for (let i = 0; i < 2000; i++) {
      fates.push(...belt.step(1, 0, 0.01))
      seen.add(belt.ir)
    }
    expect(seen).toEqual(new Set([BELT_IR, GOOD_EGG_IR, BAD_EGG_IR]))
    expect(fates.every((f) => f.fate === 'pass')).toBe(true)
    const st = belt.state()
    expect(st.passedBad).toBeGreaterThan(0)
    expect(st.rejectedBad + st.rejectedGood).toBe(0)
  })

  it('pushes the egg reaching the gate into the reject bin while the arm is down', () => {
    const belt = new Belt()
    const fates = []
    for (let i = 0; i < 300; i++) fates.push(...belt.step(1, 90, 0.01))
    expect(fates.length).toBeGreaterThan(0)
    expect(fates.every((f) => f.fate === 'reject')).toBe(true)
  })
})

describe('the board and the IR eye', () => {
  it('reads the rig on IO4, logs which pins the program reads, and flags the IR eye for the panel', () => {
    const board = createBoard()
    expect(board.$.analogRead(4)).toBe(0)
    board.setInput('adc4', 300)
    expect(board.$.analogRead(4)).toBe(300)
    board.$.analogRead(3)
    expect(board.devices.ir).toBe(true)
    expect(board.log.entries.filter((e) => e.dev === 'read').map((e) => e.key)).toEqual(['adc4', 'adc3'])
  })

  it('does not flag the IR eye for a read of another pin', () => {
    const board = createBoard()
    board.$.analogRead(0)
    expect(board.devices.ir).toBeUndefined()
  })
})

describe('Session with the egg belt', () => {
  it('runs the belt with M1, feeds the eye to the program and draws nothing without a belt', () => {
    expect(run(sorter(DOWN), 1, false).snapshot.belt).toBeNull()
    const { snapshot } = run(sorter(DOWN), 3)
    expect(snapshot.inputs.ir).toBe(true)
    // 40 % of 80 mm/s for ~3 s, less the board's start-up.
    expect(snapshot.belt?.moved).toBeGreaterThan(80)
    expect(snapshot.belt?.moved).toBeLessThan(100)
  })

  it('sorts six eggs in a row with a working program and passes the sorting rules', () => {
    const { session, snapshot } = run(sorter(DOWN), 20)
    expect(snapshot.belt?.rejectedGood).toBe(0)
    expect(snapshot.belt?.passedBad).toBe(0)
    expect(grade(['sort 6 eggs in a row', 'reject 2 bad eggs', 'read IR eye IO4'], session)).toEqual([
      { ok: true, message: '' },
      { ok: true, message: '' },
      { ok: true, message: '' },
    ])
  })

  it('lets a bad egg through when the gate never comes down, and says so', () => {
    const { session } = run(sorter(UP), 20)
    const [sorted, rejected] = grade(['sort 6 eggs in a row', 'reject 2 bad eggs'], session)
    expect(sorted.ok).toBe(false)
    expect(sorted.message).toMatch(/trứng hỏng lọt vào thùng trứng tốt/)
    expect(rejected).toEqual({
      ok: false,
      message: 'Cần gạt mới đẩy được 0 quả trứng hỏng vào thùng loại. Bài cần 2 quả.',
    })
  })

  it('misses bad eggs when a long wait keeps the program from looking', () => {
    const { snapshot } = run(sorter(DOWN, 1000), 20)
    expect(snapshot.belt?.passedBad).toBeGreaterThan(0)
  })
})
