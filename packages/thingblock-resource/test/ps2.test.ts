import { describe, expect, it } from 'vitest'
import { registerGenerators } from '../src/extensions/peripheral/ps2/generator'
import { registerGenerators as registerThingbotGenerators } from '../src/extensions/peripheral/thingbot-core/generator'
import type { ArduinoGenerator, ArduinoOrder } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

describe('PS2 generator', () => {
  it('deduplicates the include and controller instance across PS2 and ThingBot generators', () => {
    const gen = {
      forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
      includes: new Map<string, string>(),
      globals: new Map<string, string>(),
      setups: new Map<string, string>(),
      valueToCode: () => '',
    }
    registerGenerators(gen as unknown as ArduinoGenerator, Order)
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)
    const block = { getFieldValue: () => undefined }

    gen.forBlock.ps2_readData(block)
    gen.forBlock.thingBotC3_initPS2(block)

    expect(gen.includes.get('ps2x_include')).toBe('#include <PS2X_lib.h>')
    expect([...gen.globals.values()].filter((value) => value === 'PS2X ps2x;')).toHaveLength(1)
  })
})
