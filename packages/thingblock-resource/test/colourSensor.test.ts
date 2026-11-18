import { describe, expect, it } from 'vitest'
import { CHANNELS, COLOUR_NAMES, COLOURS } from '../src/extensions/peripheral/colourSensor/colours'
import { registerGenerators } from '../src/extensions/peripheral/colourSensor/generator'
import type { ArduinoGenerator, ArduinoOrder } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  valueToCode: () => '',
})

const makeBlock = (fields: Record<string, string> = {}) => ({ getFieldValue: (name: string) => fields[name] })

const arduino = () => {
  const gen = makeGenerator()
  registerGenerators(gen as unknown as ArduinoGenerator, Order)
  return gen
}

describe('colour sensor blocks', () => {
  it('codes every colour it names, and names every code', () => {
    expect(COLOURS.map(([, code]) => Number(code)).sort()).toEqual([0, 1, 2, 3, 4, 5])
    expect(COLOUR_NAMES).toHaveLength(6)
  })
})

describe('colour sensor generator', () => {
  it('starts the TCS34725 once, in setup, whichever block comes first', () => {
    const gen = arduino()
    gen.forBlock.colourSensor_read(makeBlock({ CHANNEL: '0' }))
    gen.forBlock.colourSensor_is(makeBlock({ COLOUR: '1' }))
    expect(gen.includes.get('colourSensor')).toBe('#include <Wire.h>\n#include <Adafruit_TCS34725.h>')
    expect(gen.setups.get('colourSensor')).toContain('colourTcs.begin();')
    expect(gen.globals.get('colourSensor')).toContain('TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X')
    expect(gen.forBlock.colourSensor_init(makeBlock())).toBe('')
  })

  it('keeps every statement intact before its learner comment', () => {
    const gen = arduino()
    gen.forBlock.colourSensor_init(makeBlock())
    const code = gen.globals.get('colourSensor') ?? ''
    // Comments never swallow code: every statement line still ends in `;`, `{` or `}` before any comment.
    for (const line of code.split('\n')) {
      const statement = line.split('//')[0].trim()
      if (statement) expect(statement).toMatch(/[;{}]$|^#define /)
    }
  })

  it('reads the data registers without the library wait', () => {
    const gen = arduino()
    gen.forBlock.colourSensor_init(makeBlock())
    expect(gen.globals.get('colourSensor')).toContain('colourTcs.read16(TCS34725_CDATAL)')
    expect(gen.globals.get('colourSensor')).not.toContain('getRawData')
  })

  it('reads one channel by index, clamped', () => {
    for (const [, channel] of CHANNELS)
      expect(arduino().forBlock.colourSensor_read(makeBlock({ CHANNEL: channel }))).toEqual([
        `colourSensorRead(${channel})`,
        Order.ATOMIC,
      ])
    expect(arduino().forBlock.colourSensor_read(makeBlock({ CHANNEL: '9' }))).toEqual([
      'colourSensorRead(3)',
      Order.ATOMIC,
    ])
  })

  it('compares the colour code, and names it in Vietnamese', () => {
    const gen = arduino()
    expect(gen.forBlock.colourSensor_is(makeBlock({ COLOUR: '4' }))).toEqual([
      '(colourSensorClass() == 4)',
      Order.ATOMIC,
    ])
    expect(gen.forBlock.colourSensor_name(makeBlock())).toEqual(['colourSensorName()', Order.ATOMIC])
    expect(gen.globals.get('colourSensor')).toContain('"đen", "đỏ", "xanh lá", "xanh dương", "vàng", "trắng"')
  })
})
