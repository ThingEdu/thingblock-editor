import { describe, expect, it } from 'vitest'
import { registerBlocks } from '../src/extensions/peripheral/oled/blocks'
import { registerGenerators } from '../src/extensions/peripheral/oled/generator'
import oledManifest from '../src/extensions/peripheral/oled/manifest'
import oledToolbox from '../src/extensions/peripheral/oled/toolbox'
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
  'oled_init',
  'oled_drawLine',
  'oled_drawRect',
  'oled_fillRect',
  'oled_drawCircle',
  'oled_fillCircle',
  'oled_drawRoundRect',
  'oled_fillRoundRect',
  'oled_drawTriangle',
  'oled_fillTriangle',
  'oled_setText',
  'oled_setCursor',
  'oled_print',
  'oled_clear',
  'oled_refresh',
  'oled_startScroll',
  'oled_stopScroll',
]

describe('OLED blocks', () => {
  it('defines the full seventeen-block display surface', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Object.keys(Blocks).sort()).toEqual([...blockIds].sort())
  })
})

describe('OLED generator', () => {
  it('declares one display object from the init dimensions', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.oled_init(makeBlock({ W: '128', H: '32' }, { ADDR: '0x3d' }))

    expect(gen.includes.get('oled')).toContain('#include <Adafruit_SSD1306.h>')
    expect(gen.globals.get('oled')).toBe('Adafruit_SSD1306 oled(128, 32, &Wire);')
    expect(code).toBe('oled.begin(SSD1306_SWITCHCAPVCC, 0x3d);\n')
  })

  it('emits each drawing primitive with its coordinates then the colour', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(
      gen.forBlock.oled_drawLine(makeBlock({ X0: '0', Y0: '1', X1: '2', Y1: '3' }, { COLOUR: 'SSD1306_WHITE' })),
    ).toBe('oled.drawLine(0, 1, 2, 3, SSD1306_WHITE);\n')
    expect(
      gen.forBlock.oled_fillRect(makeBlock({ X: '1', Y: '2', W: '3', H: '4' }, { COLOUR: 'SSD1306_BLACK' })),
    ).toBe('oled.fillRect(1, 2, 3, 4, SSD1306_BLACK);\n')
    expect(gen.forBlock.oled_drawCircle(makeBlock({ X: '5', Y: '6', R: '7' }, { COLOUR: 'SSD1306_INVERSE' }))).toBe(
      'oled.drawCircle(5, 6, 7, SSD1306_INVERSE);\n',
    )
    expect(
      gen.forBlock.oled_fillRoundRect(
        makeBlock({ X: '1', Y: '2', W: '3', H: '4', R: '5' }, { COLOUR: 'SSD1306_WHITE' }),
      ),
    ).toBe('oled.fillRoundRect(1, 2, 3, 4, 5, SSD1306_WHITE);\n')
    expect(
      gen.forBlock.oled_drawTriangle(
        makeBlock({ X0: '0', Y0: '0', X1: '1', Y1: '1', X2: '2', Y2: '2' }, { COLOUR: 'SSD1306_WHITE' }),
      ),
    ).toBe('oled.drawTriangle(0, 0, 1, 1, 2, 2, SSD1306_WHITE);\n')
  })

  it('picks println or print from the end-of-line field', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.oled_print(makeBlock({ DATA: '"hi"' }, { EOL: 'warp' }))).toBe('oled.println("hi");\n')
    expect(gen.forBlock.oled_print(makeBlock({ DATA: '"hi"' }, { EOL: 'noWarp' }))).toBe('oled.print("hi");\n')
  })

  it('maps each scroll direction to its driver entry point', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const scroll = (type: string) =>
      gen.forBlock.oled_startScroll(makeBlock({}, { TYPE: type, Y0: '0x00', Y1: '0x07' }))

    expect(scroll('0')).toBe('oled.startscrollright(0x00, 0x07);\n')
    expect(scroll('1')).toBe('oled.startscrollleft(0x00, 0x07);\n')
    expect(scroll('2')).toBe('oled.startscrolldiagright(0x00, 0x07);\n')
    expect(scroll('3')).toBe('oled.startscrolldiagleft(0x00, 0x07);\n')
    expect(gen.forBlock.oled_stopScroll(makeBlock())).toBe('oled.stopscroll();\n')
  })

  it('emits text setup, cursor, clear, and buffered refresh', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(
      gen.forBlock.oled_setText(makeBlock({}, { SIZE: '2', COLOUR: 'SSD1306_WHITE', BGCOLOR: 'SSD1306_BLACK' })),
    ).toBe('oled.setTextSize(2);\noled.setTextColor(SSD1306_WHITE, SSD1306_BLACK);\n')
    expect(gen.forBlock.oled_setCursor(makeBlock({ X: '10', Y: '20' }))).toBe('oled.setCursor(10, 20);\n')
    expect(gen.forBlock.oled_clear(makeBlock())).toBe('oled.clearDisplay();\n')
    expect(gen.forBlock.oled_refresh(makeBlock())).toBe('oled.display();\n')
  })

  it('falls back to a 128x64 display and safe drawing defaults', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.oled_init(makeBlock())
    expect(gen.globals.get('oled')).toBe('Adafruit_SSD1306 oled(128, 64, &Wire);')
    expect(gen.forBlock.oled_drawLine(makeBlock())).toBe('oled.drawLine(0, 0, 0, 0, SSD1306_WHITE);\n')
  })
})

describe('OLED resource pack', () => {
  it('declares its served modules, icon, and the vendored Adafruit driver stack', () => {
    expect(oledManifest).toMatchObject({
      id: 'oled',
      kind: 'peripheral',
      icon: './icon.png',
      blocks: './blocks.js',
      generator: './generator.js',
      toolbox: './toolbox.js',
      libs: [
        { path: 'libs/Adafruit_SSD1306' },
        { path: 'libs/Adafruit_GFX_Library' },
        { path: 'libs/Adafruit_BusIO' },
      ],
    })
  })

  it('lists every block in the toolbox', () => {
    expect(oledToolbox.colour).toBe('#C0C0C0')
    expect(oledToolbox.contents.map(({ type }) => type)).toEqual(blockIds)
  })
})
