import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { registerGenerators } from '../src/extensions/peripheral/thingbot-core/generator'
import type { ArduinoGenerator, ArduinoOrder } from '../src/shared/types'

/**
 * Upload mode (the thingbot-core generator) and phone control (the vendored ThingBot Telemetrix
 * firmware) drive the same PCA9685 on the same robot, so they must agree on which channel each
 * motor and servo sits on, and on which of a motor's two channels "forward" drives. The live-mode
 * image is built from the same firmware sources with the same patch, so this also pins the
 * convention the live image follows.
 */
const Order = { ATOMIC: 0 } as unknown as ArduinoOrder
const MOTORS = ['1', '2', '3', '4']

const makeGenerator = () => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  valueToCode: () => '50',
})

const firmwareDir = join(__dirname, '../src/extensions/peripheral/phoneControl/libs/ThingBotTelemetrix/src')
const firmwareHeader = readFileSync(join(firmwareDir, 'ThingBotExtended.h'), 'utf8')
const firmwareSource = readFileSync(join(firmwareDir, 'ThingBotExtended.cpp'), 'utf8')

const channelDefines = (source: string): Record<string, number> =>
  Object.fromEntries(
    [...source.matchAll(/#define\s+((?:M\d_[AB])|(?:SERVO_\d))\s+(\d+)/g)].map(([, name, channel]) => [
      name,
      Number(channel),
    ]),
  )

const generator = makeGenerator()
registerGenerators(generator as unknown as ArduinoGenerator, Order)
generator.forBlock.thingBotC3_init({ getFieldValue: () => undefined })
const generatorChannels = channelDefines(generator.globals.get('thingbot_pins') ?? '')
const firmwareChannels = channelDefines(firmwareHeader)

/**
 * The `Mn_A` / `Mn_B` macro a generated `motor` block drives with the speed.
 * @param motor The motor number, `1`..`4`.
 * @param direction The block's `forward` / `backward` field.
 * @returns The driven macro, e.g. `M1_B`.
 */
const generatorDrives = (motor: string, direction: string): string => {
  const code = generator.forBlock.thingBotC3_setMotor({
    getFieldValue: (name: string) => ({ MOTOR: motor, DIRECTION: direction })[name],
  }) as string
  const driven = [...code.matchAll(/pwm\.setPWM\((M\d_[AB]), 0, mapToPulse\(/g)].map(([, name]) => name)
  expect(driven).toHaveLength(1)
  return driven[0]
}

/**
 * The `Mn_A` / `Mn_B` macro the firmware's `control_dc` drives for a positive or negative speed.
 * @param motor The motor number, `1`..`4`.
 * @param forward Whether the speed is positive.
 * @returns The driven macro, e.g. `M1_B`.
 */
const firmwareDrives = (motor: string, forward: boolean): string => {
  const caseBody = new RegExp(`case M${motor}:([\\s\\S]*?)break;`).exec(firmwareSource)?.[1]
  if (!caseBody) throw new Error(`firmwareDrives: no case M${motor} in control_dc`)
  const branches = caseBody.split('} else {')
  if (branches.length !== 2 || !branches[0].includes('if (speed >= 0)')) {
    throw new Error(`firmwareDrives: case M${motor} is not an if (speed >= 0) / else pair`)
  }
  const branch = forward ? branches[0] : branches[1]
  const driven = [...branch.matchAll(/pwm\.setPWM\((M\d_[AB]), 0, map_speed_to_pwm\(/g)].map(([, name]) => name)
  expect(driven).toHaveLength(1)
  return driven[0]
}

describe('ThingBot motor and servo channels', () => {
  it('finds every motor and servo channel in both upload mode and the firmware', () => {
    const expected = [
      ...MOTORS.flatMap((m) => [`M${m}_A`, `M${m}_B`]),
      ...MOTORS.concat('5').map((s) => `SERVO_${s}`),
    ]
    expect(Object.keys(generatorChannels).sort()).toEqual([...expected].sort())
    expect(Object.keys(firmwareChannels).sort()).toEqual([...expected].sort())
  })

  it('puts each motor and servo on the same PCA9685 channel in upload mode and the firmware', () => {
    expect(firmwareChannels).toEqual(generatorChannels)
  })

  it.each([
    ['upload mode', generatorChannels],
    ['firmware', firmwareChannels],
  ])('gives every motor and servo a channel of its own in %s', (_where, channels) => {
    const used = Object.values(channels)
    expect(new Set(used).size).toBe(used.length)
  })

  it.each(MOTORS)('runs M%s forward on the same channel in upload mode and the firmware', (motor) => {
    expect(firmwareDrives(motor, true)).toBe(generatorDrives(motor, 'forward'))
  })

  it.each(MOTORS)('runs M%s backward on the same channel in upload mode and the firmware', (motor) => {
    expect(firmwareDrives(motor, false)).toBe(generatorDrives(motor, 'backward'))
  })

  it('maps servo angles onto the same 50 Hz pulse range as upload mode', () => {
    generator.forBlock.thingBotC3_setServoAngle({ getFieldValue: () => '1' })
    const helpers = generator.globals.get('thingbot_servo_angle') ?? ''
    const min = /#define SERVO_PULSE_MIN (\d+)/.exec(helpers)?.[1]
    const max = /#define SERVO_PULSE_MAX (\d+)/.exec(helpers)?.[1]

    // Phone control shares the sketch's PCA9685, which upload mode runs at 50 Hz, so the firmware's
    // angle map must land on the same 0.5..2.5 ms pulses.
    const firmwareMap = /map\(angle, 0, 180, (\d+), (\d+)\)/.exec(firmwareSource)
    expect([firmwareMap?.[1], firmwareMap?.[2]]).toEqual([min, max])
  })
})
