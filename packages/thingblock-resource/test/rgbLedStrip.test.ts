import { describe, expect, it } from 'vitest'
import { registerBlocks } from '../src/extensions/peripheral/rgbLedStrip/blocks'
import { registerGenerators } from '../src/extensions/peripheral/rgbLedStrip/generator'
import rgbLedStripManifest from '../src/extensions/peripheral/rgbLedStrip/manifest'
import rgbLedStripToolbox from '../src/extensions/peripheral/rgbLedStrip/toolbox'
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

const blockIds = [
  'rgbLedStrip_init',
  'rgbLedStrip_setPixelColor',
  'rgbLedStrip_fill',
  'rgbLedStrip_color',
  'rgbLedStrip_setBrightness',
  'rgbLedStrip_clear',
  'rgbLedStrip_show',
]

describe('RGB LED strip blocks', () => {
  it('defines the seven strip block opcodes', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Object.keys(Blocks)).toEqual(blockIds)
  })
})

describe('RGB LED strip generator', () => {
  it('declares one strip object from the init length and pin', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.rgbLedStrip_init(makeBlock({ LEN: '30' }, { PIN: '6' }))

    expect(code).toBe('ledStrip.begin();\n')
    expect(gen.includes.get('rgbLedStrip')).toBe('#include <Adafruit_NeoPixel.h>')
    expect(gen.globals.get('rgbLedStrip')).toBe('Adafruit_NeoPixel ledStrip(30, 6, NEO_GRB + NEO_KHZ800);')
  })

  it('converts 1-based palette pixel indices to the library 0-based API', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.rgbLedStrip_setPixelColor(makeBlock({ NO: '3', COLOR: '0xff8800' }))).toBe(
      'ledStrip.setPixelColor(3 - 1, 0xff8800);\n',
    )
    expect(gen.forBlock.rgbLedStrip_fill(makeBlock({ FIRST: '2', COUNT: '5', COLOR: '0x00ff00' }))).toBe(
      'ledStrip.fill(0x00ff00, 2 - 1, 5);\n',
    )
  })

  it('emits the colour reporter, brightness, clear, and show', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.rgbLedStrip_color(makeBlock({ R: '10', G: '20', B: '30' }))).toEqual([
      'ledStrip.Color(10, 20, 30)',
      Order.ATOMIC,
    ])
    expect(gen.forBlock.rgbLedStrip_setBrightness(makeBlock({ BRT: '128' }))).toBe('ledStrip.setBrightness(128);\n')
    expect(gen.forBlock.rgbLedStrip_clear(makeBlock())).toBe('ledStrip.clear();\n')
    expect(gen.forBlock.rgbLedStrip_show(makeBlock())).toBe('ledStrip.show();\n')
  })

  it('falls back to safe defaults when value inputs are empty', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.rgbLedStrip_init(makeBlock())
    expect(gen.globals.get('rgbLedStrip')).toBe('Adafruit_NeoPixel ledStrip(16, 2, NEO_GRB + NEO_KHZ800);')
    expect(gen.forBlock.rgbLedStrip_setPixelColor(makeBlock())).toBe('ledStrip.setPixelColor(1 - 1, 0x000000);\n')
  })
})

describe('RGB LED strip resource pack', () => {
  it('declares its served modules, icon, and vendored library', () => {
    expect(rgbLedStripManifest).toMatchObject({
      id: 'rgbLedStrip',
      kind: 'peripheral',
      icon: './icon.png',
      blocks: './blocks.js',
      generator: './generator.js',
      toolbox: './toolbox.js',
      libs: [{ path: 'libs/Adafruit_NeoPixel' }],
    })
  })

  it('preserves the toolbox block order and pre-fills colour inputs with the picker', () => {
    expect(rgbLedStripToolbox.colour).toBe('#7700FF')
    expect(rgbLedStripToolbox.contents.map(({ type }) => type)).toEqual(blockIds)

    const setPixel = rgbLedStripToolbox.contents.find(({ type }) => type === 'rgbLedStrip_setPixelColor')
    expect(setPixel?.inputs?.COLOR).toEqual({ type: 'colour_picker' })
  })
})
