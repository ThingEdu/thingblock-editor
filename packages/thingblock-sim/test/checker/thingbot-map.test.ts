// packages/thingblock-sim/test/checker/thingbot-map.test.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BUZZER_CHANNEL,
  dutyToAngle,
  LIGHT_CHANNEL,
  MOTOR_CHANNELS,
  SERVO_CHANNEL,
  SERVO_PULSE,
  SWITCH_GPIO,
} from '../../src/checker/thingbot-map'

/**
 * The `const X = n` assignments the ThingBot sim codegen emits, by name.
 * @returns Each constant's value keyed by its name.
 */
const simConstants = (): Record<string, number> => {
  const source = readFileSync(
    join(__dirname, '../../../thingblock-resource/src/extensions/peripheral/thingbot-core/sim.ts'),
    'utf8',
  )
  const constants: Record<string, number> = {}
  for (const [, name, value] of source.matchAll(/\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*) = (\d+)/g))
    constants[name] = Number(value)
  return constants
}

describe('ThingBot channel map', () => {
  const c = simConstants()

  it('matches the LED, buzzer and switch constants the sim codegen uses', () => {
    expect(LIGHT_CHANNEL).toEqual({ L1: c.LED_1, L2: c.LED_2 })
    expect(BUZZER_CHANNEL).toBe(c.BUZZER)
    expect(SWITCH_GPIO).toBe(c.SW)
  })

  it('matches every motor A/B pair', () => {
    for (const n of [1, 2, 3, 4]) {
      expect(MOTOR_CHANNELS[`M${n}` as keyof typeof MOTOR_CHANNELS]).toEqual({ a: c[`M${n}_A`], b: c[`M${n}_B`] })
    }
  })

  it('matches every servo channel and the pulse range', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      expect(SERVO_CHANNEL[`S${n}` as keyof typeof SERVO_CHANNEL]).toBe(c[`SERVO_${n}`])
    }
    expect(SERVO_PULSE).toEqual({ min: c.SERVO_PULSE_MIN, max: c.SERVO_PULSE_MAX })
  })

  it('inverts the servo angle mapping at both ends and the middle', () => {
    expect(dutyToAngle(102)).toBe(0)
    expect(dutyToAngle(512)).toBe(180)
    expect(dutyToAngle(307)).toBe(90)
  })
})
