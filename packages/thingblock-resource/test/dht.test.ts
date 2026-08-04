import { describe, expect, it } from 'vitest'
import { registerBlocks } from '../src/extensions/peripheral/dht/blocks'
import { registerGenerators } from '../src/extensions/peripheral/dht/generator'
import dhtManifest from '../src/extensions/peripheral/dht/manifest'
import dhtToolbox from '../src/extensions/peripheral/dht/toolbox'
import type { ArduinoGenerator, ArduinoOrder, Blockly } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  valueToCode: (block: { values: Record<string, string> }, name: string) => block.values[name] ?? '',
})

const makeBlock = (values: Record<string, string> = {}, fields: Record<string, string> = {}) => ({
  values,
  getFieldValue: (name: string) => fields[name],
})

describe('DHT blocks', () => {
  it('defines the three DHT block opcodes', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Object.keys(Blocks)).toEqual(['dht_init', 'dht_readHumidity', 'dht_readTemperature'])
  })
})

describe('DHT generator', () => {
  it('emits the include and one DHT object keyed by instance number', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.dht_init(makeBlock({ NO: '1' }, { PIN: '2', MODEL: '22' }))

    expect(code).toBe('')
    expect(gen.includes.get('dht')).toBe('#include <DHT.h>')
    expect(gen.globals.get('dht_1')).toBe('DHT dht_1(2, 22);')
  })

  it('falls back to instance 1, pin 2, and dht11 when inputs are empty', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.dht_init(makeBlock())

    expect(gen.globals.get('dht_1')).toBe('DHT dht_1(2, 11);')
  })

  it('reads humidity and temperature from the instance matching NO', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.dht_readHumidity(makeBlock({ NO: '2' }))).toEqual(['dht_2.readHumidity()', Order.ATOMIC])
    expect(gen.forBlock.dht_readTemperature(makeBlock({ NO: '2' }, { UNIT: 'true' }))).toEqual([
      'dht_2.readTemperature(true)',
      Order.ATOMIC,
    ])
  })
})

describe('DHT resource pack', () => {
  it('declares its served modules, icon, and vendored library', () => {
    expect(dhtManifest).toMatchObject({
      id: 'dht',
      kind: 'peripheral',
      icon: './icon.png',
      blocks: './blocks.js',
      generator: './generator.js',
      toolbox: './toolbox.js',
      libs: [{ path: 'libs/DHT_sensor_library' }],
    })
  })

  it('toolbox fills the NO value input with a math_number shadow on every block', () => {
    expect(dhtToolbox.colour).toBe('#42CCFF')
    for (const item of dhtToolbox.contents) {
      expect(item.inputs).toEqual({ NO: { type: 'math_number', fields: { NUM: 1 } } })
    }
  })
})
