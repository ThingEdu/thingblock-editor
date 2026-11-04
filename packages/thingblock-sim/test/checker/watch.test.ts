import { describe, expect, it } from 'vitest'
import { parseRule } from '../../src/checker/rules'
import { Watcher } from '../../src/checker/watch'
import { Session } from '../../src/session'

const LIGHT_ON = `
const LED_1 = 15;
const pwm = $.hw.Adafruit_PWMServoDriver();
function* setup() { pwm.begin(); yield "on"; pwm.setPin(LED_1, 4095); }
function* loop() { yield $.delay(1000); }
return { setup, loop };
`

const LIGHT_LATER = `
const LED_1 = 15;
const pwm = $.hw.Adafruit_PWMServoDriver();
function* setup() { pwm.begin(); }
function* loop() { yield $.delay(100); pwm.setPin(LED_1, 4095); yield $.delay(1000); }
return { setup, loop };
`

const SETUP_WAITS = `
const LED_1 = 15;
const pwm = $.hw.Adafruit_PWMServoDriver();
function* setup() { pwm.begin(); pwm.setPin(LED_1, 4095); while (true) { yield $.delay(1000); } }
function* loop() { yield $.delay(1000); }
return { setup, loop };
`

describe('Watcher', () => {
  it('reports once when results first appear and again only when they change', () => {
    const session = new Session(LIGHT_LATER, { now: () => 0 })
    const watcher = new Watcher()
    watcher.set([parseRule('L1 sáng')])

    session.running = true
    session.tick(16)
    const before = watcher.after(session)
    expect(before?.results).toEqual([{ ok: false, message: 'Đèn L1 chưa sáng.' }])
    expect(watcher.after(session)).toBeNull()

    session.running = true
    session.tick(200)
    const after = watcher.after(session)
    expect(after?.results).toEqual([{ ok: true, message: '' }])
    expect(after?.phase).toBe('loop')
    expect(watcher.after(session)).toBeNull()
  })

  it('grades nothing while setup is still running, so an "off" rule cannot pass at power-on', () => {
    const session = new Session(LIGHT_ON, { now: () => 0 })
    const watcher = new Watcher()
    watcher.set([parseRule('L1 tắt')])
    expect(watcher.after(session)).toBeNull()

    session.running = true
    // pwm.begin() takes 10 ms, so the first tick stops inside setup with L1 not yet set.
    expect(session.tick(16).phase).toBe('setup')
    expect(watcher.after(session)).toBeNull()

    expect(session.tick(16).phase).toBe('loop')
    expect(watcher.after(session)?.results).toEqual([{ ok: false, message: 'Đèn L1 đang sáng. Bài cần L1 tắt.' }])
  })

  it('grades a setup that waits, as a program that never leaves setup does', () => {
    const session = new Session(SETUP_WAITS, { now: () => 0 })
    const watcher = new Watcher()
    watcher.set([parseRule('L1 sáng')])
    session.running = true
    expect(session.tick(100).phase).toBe('setup')
    expect(watcher.after(session)?.results).toEqual([{ ok: true, message: '' }])
  })

  it('reports nothing while no rules are set', () => {
    const watcher = new Watcher()
    expect(watcher.after(new Session(LIGHT_ON))).toBeNull()
    watcher.set([parseRule('L1 sáng')])
    watcher.set(null)
    expect(watcher.after(new Session(LIGHT_ON))).toBeNull()
  })

  it('forgets the last report on reset so a reloaded program is graded afresh', () => {
    const watcher = new Watcher()
    watcher.set([parseRule('L1 sáng')])
    const session = new Session(LIGHT_ON, { now: () => 0 })
    session.running = true
    session.tick(100)
    watcher.after(session)
    watcher.reset()
    expect(watcher.after(session)).not.toBeNull()
  })
})

const L2_ONLY = `
const LED_2 = 13;
const pwm = $.hw.Adafruit_PWMServoDriver();
function* setup() { pwm.begin(); pwm.setPin(LED_2, 4095); }
function* loop() { yield $.delay(500); }
return { setup, loop };
`

describe('worker protocol', () => {
  // Mirrors worker.ts: `load` posts a snapshot then `after`; every tick posts a snapshot then `after`. The first
  // check comes after the first tick, then none while the verdict stays the same.
  it('posts one check for a program that never satisfies the rules while snapshots keep advancing', () => {
    const session = new Session(L2_ONLY, { now: () => 0 })
    const watcher = new Watcher()
    watcher.set([parseRule('L1 sáng')])
    const checks = [watcher.after(session)]
    session.running = true
    let t = 0
    for (let i = 0; i < 600; i++) {
      t = session.tick(16).t
      checks.push(watcher.after(session))
    }
    const posted = checks.filter((c) => c !== null)
    expect(posted).toHaveLength(1)
    expect(posted[0]?.results).toEqual([{ ok: false, message: 'Đèn L1 chưa sáng.' }])
    expect(posted[0]?.t).toBeLessThan(20_000)
    expect(t).toBeGreaterThan(5_000_000)
  })
})
