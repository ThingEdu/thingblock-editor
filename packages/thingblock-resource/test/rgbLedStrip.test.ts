import { describe, expect, it } from 'vitest'
import { registerGenerators } from '../src/extensions/peripheral/rgbLedStrip/generator'
import type { ArduinoGenerator, ArduinoOrder } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

describe('RGB LED strip generator', () => {
  it('converts 1-based palette pixel indices to the library 0-based API', () => {
    const gen = {
      forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
      includes: new Map<string, string>(),
      globals: new Map<string, string>(),
      setups: new Map<string, string>(),
      valueToCode: (block: { values: Record<string, string> }, name: string) => block.values[name] ?? '',
    }
    registerGenerators(gen as unknown as ArduinoGenerator, Order)
    const block = (values: Record<string, string>) => ({ values, getFieldValue: () => undefined })

    expect(gen.forBlock.rgbLedStrip_setPixelColor(block({ NO: '3', COLOR: '0xff8800' }))).toBe(
      'ledStrip.setPixelColor(3 - 1, 0xff8800);\n',
    )
    expect(gen.forBlock.rgbLedStrip_fill(block({ FIRST: '2', COUNT: '5', COLOR: '0x00ff00' }))).toBe(
      'ledStrip.fill(0x00ff00, 2 - 1, 5);\n',
    )
  })
})
