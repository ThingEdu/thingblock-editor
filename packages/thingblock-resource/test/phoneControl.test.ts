import { describe, expect, it } from 'vitest'
import type { ArduinoGenerator, ArduinoOrder } from '../src/shared/types'
import { registerGenerators } from '../src/extensions/peripheral/phoneControl/generator'
import toolbox from '../src/extensions/peripheral/phoneControl/toolbox'

const Order = { ATOMIC: 0, NONE: 99 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  forBlock: {} as Record<string, (block: unknown) => string>,
  valueToCode: () => '"Xe cua em"',
})

describe('phoneControl', () => {
  it('starts the service from setups, not from where the block sits', () => {
    // A program that opens with `wait` blocks would otherwise leave the phone unable to connect
    // until those waits finished, and two copies of the block would start two services.
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.phoneControl_start({})

    expect(code).toBe('')
    expect(gen.setups.get('phone_control')).toBe('thingbotPhoneControlBegin("Xe cua em");')
    expect(gen.includes.get('phone_control')).toContain('ThingBotTelemetrixService.h')
  })

  it('collapses two blocks onto one service', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.phoneControl_start({})
    gen.forBlock.phoneControl_start({})

    expect(gen.setups.size).toBe(1)
    expect(gen.includes.size).toBe(1)
  })

  it('offers the block with a board name already filled in', () => {
    // An empty name field would advertise an unnamed peripheral, which is unfindable in a
    // classroom where every board advertises at once.
    expect(toolbox.contents).toHaveLength(1)
    const block = toolbox.contents[0] as { type: string; inputs?: Record<string, unknown> }
    expect(block.type).toBe('phoneControl_start')
    expect(block.inputs?.NAME).toEqual({ type: 'text', fields: { TEXT: 'ThingBot' } })
  })
})
