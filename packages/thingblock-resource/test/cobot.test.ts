import { describe, expect, it } from 'vitest'
import { IR_SENSORS, registerBlocks } from '../src/extensions/peripheral/cobot/blocks'
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
  it('defines the IR blocks only: the colour sensor is its own pack', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Object.keys(Blocks).sort()).toEqual(['cobot_irLight', 'cobot_readIr'])
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

  it('drives the IR emitters on IO21', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)
    expect(gen.forBlock.cobot_irLight(makeBlock({ STATE: 'HIGH' }))).toBe('digitalWrite(21, HIGH);\n')
    expect(gen.forBlock.cobot_irLight(makeBlock({ STATE: 'LOW' }))).toBe('digitalWrite(21, LOW);\n')
    expect(gen.setups.get('cobot_ir_light')).toBe('pinMode(21, OUTPUT);')
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
})

describe('cobot resource pack', () => {
  it('declares its served modules and needs no library', () => {
    expect(cobotManifest).toMatchObject({
      id: 'cobot',
      kind: 'peripheral',
      blocks: './blocks.js',
      generator: './generator.js',
      sim: './sim.js',
      toolbox: './toolbox.js',
    })
    expect(cobotManifest.libs).toBeUndefined()
    expect(cobotToolbox.contents.map((c) => (c as { type: string }).type)).toEqual(['cobot_irLight', 'cobot_readIr'])
  })
})
