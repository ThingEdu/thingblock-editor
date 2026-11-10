import { describe, expect, it } from 'vitest'
import { registerGenerators } from '../src/extensions/peripheral/thingbot-core/generator'
import type { ArduinoGenerator, ArduinoOrder } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

const makeGenerator = (values: Record<string, string> = {}) => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  loopHooks: new Map<string, string>(),
  valueToCode: (_block: unknown, name: string) => values[name] ?? '',
})

const generate = (opcode: string, fields: Record<string, string> = {}, values: Record<string, string> = {}) => {
  const gen = makeGenerator(values)
  registerGenerators(gen as unknown as ArduinoGenerator, Order)
  return { gen, code: gen.forBlock[opcode]({ getFieldValue: (name: string) => fields[name] }) as string }
}

describe('thingbot-core generator', () => {
  it('gives up initializing PS2 after a bounded number of tries so setup() always finishes', () => {
    const { gen, code } = generate('thingBotC3_initPS2')

    expect(gen.globals.get('thingbot_ps2_pins')).toContain('#define PS2_MAX_TRIES 10')
    expect(code).toMatch(/^while \(error != 0 && tryNum <= PS2_MAX_TRIES\) \{/)
    expect(code).toContain('tryNum++;')
  })

  it('passes the buzzer pulse as the duty value, not as the invert flag of setPin()', () => {
    // Adafruit_PWMServoDriver::setPin(num, val, invert = false): a third argument would be `invert`.
    const { code } = generate('thingBotC3_buzzer', {}, { SOUND: '2048' })
    expect(code).toBe('pwm.setPin(BUZZER, 2048);\n')
  })

  it('resolves every note name and octave to an equal-tempered frequency', () => {
    const hz = (note: string, octave: string) =>
      generate('thingBotC3_playNote', { NOTE: note, OCTAVE: octave }, { BEATS: '1' }).code

    expect(hz('C', '4')).toBe('musicPlay(262, 1);\n')
    expect(hz('G', '4')).toBe('musicPlay(392, 1);\n')
    expect(hz('C', '5')).toBe('musicPlay(523, 1);\n')
    expect(hz('A', '3')).toBe('musicPlay(220, 1);\n')
    expect(hz('A#', '4')).toBe('musicPlay(466, 1);\n')
  })

  it('guards the servo tick against a zero or negative duration instead of dividing by it', () => {
    const { gen } = generate('thingBotC3_startServoAngle')
    expect(gen.globals.get('thingbot_servo_angle') ?? '').toMatch(/dur = seconds > 0/)
  })
})
