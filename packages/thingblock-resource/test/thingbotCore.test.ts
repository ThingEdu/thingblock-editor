import { describe, expect, it } from 'vitest'
import { registerBlocks } from '../src/extensions/peripheral/thingbot-core/blocks'
import { registerGenerators } from '../src/extensions/peripheral/thingbot-core/generator'
import type { ArduinoGenerator, ArduinoOrder, Blockly } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

const makeGenerator = (values: Record<string, string> = {}) => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  loopHooks: new Map<string, string>(),
  valueToCode: (_block: unknown, name: string) => values[name] ?? '',
})

const makeBlock = (fields: Record<string, string> = {}) => ({
  getFieldValue: (name: string) => fields[name],
})

const generate = (opcode: string, fields: Record<string, string> = {}, values: Record<string, string> = {}) => {
  const gen = makeGenerator(values)
  registerGenerators(gen as unknown as ArduinoGenerator, Order)
  return { gen, code: gen.forBlock[opcode](makeBlock(fields)) as string }
}

describe('init PS2 on ThingBot', () => {
  it('gives up after a bounded number of tries so setup() always finishes', () => {
    const { gen, code } = generate('thingBotC3_initPS2')

    expect(gen.globals.get('thingbot_ps2_pins')).toContain('#define PS2_MAX_TRIES 10')
    // A missing receiver or controller must not hold the robot in setup() forever.
    expect(code).toMatch(/^while \(error != 0 && tryNum <= PS2_MAX_TRIES\) \{/)
    expect(code).toContain('error = ps2x.config_gamepad(PS2_CLK, PS2_CMD, PS2_SEL, PS2_DAT, pressures, rumble);')
    expect(code).toContain('tryNum++;')
  })

  it('reports on Serial when it carries on without a controller', () => {
    const { code } = generate('thingBotC3_initPS2')

    const afterLoop = code.slice(code.indexOf('\n}\n'))
    expect(afterLoop).toContain('if (error != 0) {')
    expect(afterLoop).toContain('Serial.println')
  })
})

describe('set buzzer to N pulse', () => {
  it('passes the pulse as the duty value, not as the invert flag of setPin()', () => {
    // Adafruit_PWMServoDriver::setPin(num, val, invert = false): a third argument would be `invert`.
    const { code } = generate('thingBotC3_buzzer', {}, { SOUND: '2048' })
    expect(code).toBe('pwm.setPin(BUZZER, 2048);\n')
  })
})

describe('start servo block', () => {
  it('steps started motions from every loop() pass, so the servo moves without a wait block', () => {
    const { gen, code } = generate('thingBotC3_startServoAngle', { SERVO: '1' }, { ANGLE: '45', SECONDS: '2' })
    expect(code).toBe('servoStart(SERVO_1, 45, 2);\n')
    expect([...gen.loopHooks.values()]).toEqual(['servoTickAll();'])
  })
  it('tells the learner the motion runs in the background and "wait for servos" waits for it', () => {
    const Blocks: Record<string, { init(this: { jsonInit: (config: { tooltip?: string }) => void }): void }> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    let tooltip: string | undefined
    Blocks.thingBotC3_startServoAngle.init.call({ jsonInit: (config) => (tooltip = config.tooltip) })
    expect(tooltip).toContain('background')
    expect(tooltip).toContain('wait for servos')
  })
})

describe('notes and servo timing (from main)', () => {
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
