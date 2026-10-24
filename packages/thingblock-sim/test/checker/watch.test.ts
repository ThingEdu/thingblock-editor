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

describe('Watcher', () => {
  it('reports once when results first appear and again only when they change', () => {
    const session = new Session(LIGHT_ON)
    const watcher = new Watcher()
    watcher.set([parseRule('L1 sáng')])

    const before = watcher.after(session)
    expect(before?.results).toEqual([{ ok: false, message: 'Đèn L1 chưa sáng.' }])
    expect(watcher.after(session)).toBeNull()

    session.running = true
    session.tick(100)
    const after = watcher.after(session)
    expect(after?.results).toEqual([{ ok: true, message: '' }])
    expect(after?.phase).toBe('loop')
    expect(watcher.after(session)).toBeNull()
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
    const session = new Session(LIGHT_ON)
    watcher.after(session)
    watcher.reset()
    expect(watcher.after(session)).not.toBeNull()
  })
})
