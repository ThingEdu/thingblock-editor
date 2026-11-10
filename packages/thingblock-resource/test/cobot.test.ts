import { describe, expect, it } from 'vitest'
import { COLOUR_CHANNELS, IR_SENSORS, registerBlocks } from '../src/extensions/peripheral/cobot/blocks'
import { registerGenerators } from '../src/extensions/peripheral/cobot/generator'
import cobotManifest from '../src/extensions/peripheral/cobot/manifest'
import { registerSimGenerators } from '../src/extensions/peripheral/cobot/sim'
import cobotToolbox from '../src/extensions/peripheral/cobot/toolbox'
import type { ArduinoGenerator, ArduinoOrder, Blockly, SimGenerator } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  valueToCode: () => '',
})

const makeBlock = (fields: Record<string, string | number> = {}) => ({
  getFieldValue: (name: string) => fields[name],
})

describe('cobot blocks', () => {
  it('defines the four sensor blocks', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Object.keys(Blocks).sort()).toEqual([
      'cobot_colourLight',
      'cobot_irLight',
      'cobot_readColour',
      'cobot_readIr',
    ])
  })

  it('numbers the IR sensors on the cobot-arduino pins', () => {
    expect(IR_SENSORS.map(([, pin]) => pin)).toEqual(['4', '3', '1', '0'])
  })
})

describe('cobot generator', () => {
  it('reads an IR sensor as a plain analogRead of its GPIO', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)
    expect(gen.forBlock.cobot_readIr(makeBlock({ PIN: '0' }))).toEqual(['analogRead(0)', Order.ATOMIC])
    expect(gen.forBlock.cobot_readIr(makeBlock())).toEqual(['analogRead(4)', Order.ATOMIC])
  })

  it('drives the IR emitters on IO21 and the white LED on IO20', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)
    expect(gen.forBlock.cobot_irLight(makeBlock({ STATE: 'HIGH' }))).toBe('digitalWrite(21, HIGH);\n')
    expect(gen.forBlock.cobot_colourLight(makeBlock({ STATE: 'LOW' }))).toBe('digitalWrite(20, LOW);\n')
    expect(gen.setups.get('cobot_ir_light')).toBe('pinMode(21, OUTPUT);')
    expect(gen.setups.get('cobot_colour_light')).toBe('pinMode(20, OUTPUT);')
  })

  it('reads one raw TCS34725 channel through a shared driver object', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)
    expect(gen.forBlock.cobot_readColour(makeBlock({ CHANNEL: '0' }))).toEqual(['cobotColour(0)', Order.ATOMIC])
    expect(gen.forBlock.cobot_readColour(makeBlock({ CHANNEL: '9' }))).toEqual(['cobotColour(3)', Order.ATOMIC])
    expect(gen.includes.get('cobot_colour')).toContain('#include <Adafruit_TCS34725.h>')
    expect(gen.globals.get('cobot_colour')).toContain('TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X')
    expect(gen.setups.get('cobot_colour')).toBe('cobotTcs.begin();')
  })
})

describe('cobot simulator codegen', () => {
  const sim = () => {
    const gen = makeGenerator()
    registerSimGenerators(gen as unknown as SimGenerator, Order)
    return gen
  }

  it('reads the rig input of the same GPIO the Arduino build reads', () => {
    for (const [, pin] of IR_SENSORS)
      expect(sim().forBlock.cobot_readIr(makeBlock({ PIN: pin }))).toEqual([`$.analogRead(${pin})`, Order.ATOMIC])
  })

  it('reads each colour channel from its own rig input', () => {
    for (const [, channel] of COLOUR_CHANNELS)
      expect(sim().forBlock.cobot_readColour(makeBlock({ CHANNEL: channel }))).toEqual([
        `$.analogRead("colour_${channel}")`,
        Order.ATOMIC,
      ])
  })
})

describe('cobot resource pack', () => {
  it('declares its served modules and vendored libraries', () => {
    expect(cobotManifest).toMatchObject({
      id: 'cobot',
      kind: 'peripheral',
      blocks: './blocks.js',
      generator: './generator.js',
      sim: './sim.js',
      toolbox: './toolbox.js',
      libs: [{ path: 'libs/Adafruit_TCS34725' }, { path: 'libs/Adafruit_BusIO' }],
    })
    expect(cobotToolbox.contents.map((c) => (c as { type: string }).type)).toEqual([
      'cobot_irLight',
      'cobot_readIr',
      'cobot_colourLight',
      'cobot_readColour',
    ])
  })
})
