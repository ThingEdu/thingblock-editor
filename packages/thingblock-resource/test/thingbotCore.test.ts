import { describe, expect, it } from 'vitest'
import { registerGenerators } from '../src/extensions/peripheral/thingbot-core/generator'
import type { ArduinoGenerator, ArduinoOrder } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

const makeGenerator = (values: Record<string, string> = {}) => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
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
