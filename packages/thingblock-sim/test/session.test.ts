import { describe, expect, it } from 'vitest'
import { Session } from '../src/session'

/** A blink program as the simulator generator writes it for the k4-01 project. */
const BLINK = `
const LED_1 = 15;
const pwm = $.hw.Adafruit_PWMServoDriver();
function* setup() { pwm.begin(); }
function* loop() {
  yield "on"; pwm.setPin(LED_1, 4095);
  yield "wait1"; yield $.delay(500);
  yield "off"; pwm.setPin(LED_1, 0);
  yield "wait2"; yield $.delay(500);
}
return { setup, loop };
`

describe('Session', () => {
  it('runs only while running, scaled by speed', () => {
    const session = new Session(BLINK)
    expect(session.tick(100).t).toBe(0)

    session.running = true
    session.speed = 10
    const snapshot = session.tick(100)

    expect(snapshot.t).toBe(1_000_000)
  })

  it('shows the LED channel lit in the snapshot while the program has it on', () => {
    const session = new Session(BLINK)
    session.running = true
    // begin() takes ~16 ms; 100 ms in, the LED is in its first on phase.
    expect(session.tick(100).pwm[15]).toBe(4096)
    expect(session.tick(500).pwm[15]).toBe(0)
  })

  it('steps one block at a time and stops running', () => {
    const session = new Session(BLINK)
    session.running = true
    const snapshot = session.step()
    expect(snapshot.block).toBe('on')
    expect(snapshot.running).toBe(false)
    expect(session.step().block).toBe('wait1')
  })

  it('reports serial text once, in the snapshot after it was printed', () => {
    const session = new Session(
      'function* setup() { $.Serial.println("hi"); } function* loop() { yield $.delay(1000); } return { setup, loop };',
    )
    session.running = true
    expect(session.tick(10).serial).toBe('hi\r\n')
    expect(session.tick(10).serial).toBe('')
  })

  it('stops running when the program halts on a board trap', () => {
    const session = new Session('function* setup() { $.idiv(1, 0); } function* loop() {} return { setup, loop };')
    session.running = true
    const snapshot = session.tick(10)
    expect(snapshot.phase).toBe('halted')
    expect(snapshot.running).toBe(false)
    expect(snapshot.error).toBe('IntegerDivideByZero')
  })

  it('hands control back once its real-time budget is spent, even if the program is behind', () => {
    // A clock that moves 1 ms of real time per reading: the 8 ms budget runs out after a few slices.
    let fakeNow = 0
    const session = new Session(
      'let x = 0; function* setup() {} function* loop() { while (true) { yield "a"; x = $.i32(x + 1); } } return { setup, loop };',
      { now: () => fakeNow++ },
    )
    session.running = true
    session.speed = 100

    const snapshot = session.tick(16)

    // 16 ms at 100x asks for 1.6 s of virtual time; a busy loop cannot get there in the budget.
    expect(snapshot.t).toBeLessThan(1_600_000)
    expect(snapshot.t).toBeGreaterThan(0)
    expect(snapshot.behind).toBe(true)
  })

  it('is not behind when it reaches the requested virtual time', () => {
    const session = new Session(BLINK)
    session.running = true
    expect(session.tick(16).behind).toBe(false)
  })
})
