/**
 * SSD1306 / SH1106 OLED Arduino codegen. One display object declared from the init block's dimensions;
 * every drawing block writes into that object's buffer, which only reaches the panel on `oled_refresh`
 * (`display()`) — the driver is buffered, so drawing without a refresh shows nothing.
 *
 * The SH1106 (the common 1.3" 128x64 panel) answers on the same I2C address as an SSD1306 but needs its
 * own driver: driven as an SSD1306 it acknowledges every write and stays dark. Both Adafruit drivers
 * share the GFX drawing API, so every other block's codegen is chip-independent.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterGenerators } from '../../../shared/types'

/** Scroll direction field value → the driver's scroll entry point. */
const SCROLL_CALLS: Record<string, string> = {
  '0': 'startscrollright',
  '1': 'startscrollleft',
  '2': 'startscrolldiagright',
  '3': 'startscrolldiagleft',
}

/**
 * SH1106 driver shim. The drawing blocks emit the SSD1306 colour names, so they are aliased to the
 * SH110X values (identical numbers). The SH1106 has no hardware scroll, so the scroll entry points the
 * scroll blocks call are no-ops here rather than compile errors.
 */
const SH1106_INCLUDES = `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#define SSD1306_BLACK SH110X_BLACK
#define SSD1306_WHITE SH110X_WHITE
#define SSD1306_INVERSE SH110X_INVERSE`

const sh1106Global = (w: string, h: string): string => `class ThingBlockSH1106 : public Adafruit_SH1106G {
 public:
  using Adafruit_SH1106G::Adafruit_SH1106G;
  void startscrollright(uint8_t, uint8_t) {}
  void startscrollleft(uint8_t, uint8_t) {}
  void startscrolldiagright(uint8_t, uint8_t) {}
  void startscrolldiagleft(uint8_t, uint8_t) {}
  void stopscroll() {}
};
ThingBlockSH1106 oled(${w}, ${h}, &Wire);`

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }

  const input = (block: Block, name: string, fallback: string): string =>
    generator.valueToCode(block, name, Order.ATOMIC) || fallback

  /**
   * Build a drawing block's generator: read its coordinate inputs, append the colour field, and
   * call the matching GFX method. Every primitive takes its coordinates then a trailing colour.
   * @param method The Adafruit_SSD1306 method to call.
   * @param inputs The block's coordinate value-input names, in call order.
   * @returns The `forBlock` generator for that drawing block.
   */
  const draw =
    (method: string, inputs: string[]) =>
    (block: Block): string => {
      const args = inputs.map((name) => input(block, name, '0'))
      args.push(fieldValue(block, 'COLOUR', 'SSD1306_WHITE'))
      return `oled.${method}(${args.join(', ')});\n`
    }

  generator.forBlock.oled_init = (block) => {
    const w = input(block, 'W', '128')
    const h = input(block, 'H', '64')
    const addr = fieldValue(block, 'ADDR', '0x3c')

    if (fieldValue(block, 'CHIP', 'SSD1306') === 'SH1106') {
      generator.includes.set('oled', SH1106_INCLUDES)
      generator.globals.set('oled', sh1106Global(w, h))
      return `oled.begin(${addr}, true);\noled.setTextColor(SSD1306_WHITE);\n`
    }

    generator.includes.set('oled', '#include <Wire.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>')
    generator.globals.set('oled', `Adafruit_SSD1306 oled(${w}, ${h}, &Wire);`)

    // Adafruit_GFX starts with textcolor 0xFFFF, and Adafruit_SSD1306::drawPixel only acts on
    // WHITE/BLACK/INVERSE — every other value is silently dropped. So a display that is wired
    // and initialized correctly still shows nothing for `oled print` until a colour is set, with
    // no error to explain it. Establish a drawable default here, the way every Adafruit example
    // does; `set text` still overrides it.
    return `oled.begin(SSD1306_SWITCHCAPVCC, ${addr});\noled.setTextColor(SSD1306_WHITE);\n`
  }

  generator.forBlock.oled_drawLine = draw('drawLine', ['X0', 'Y0', 'X1', 'Y1'])
  generator.forBlock.oled_drawRect = draw('drawRect', ['X', 'Y', 'W', 'H'])
  generator.forBlock.oled_fillRect = draw('fillRect', ['X', 'Y', 'W', 'H'])
  generator.forBlock.oled_drawCircle = draw('drawCircle', ['X', 'Y', 'R'])
  generator.forBlock.oled_fillCircle = draw('fillCircle', ['X', 'Y', 'R'])
  generator.forBlock.oled_drawRoundRect = draw('drawRoundRect', ['X', 'Y', 'W', 'H', 'R'])
  generator.forBlock.oled_fillRoundRect = draw('fillRoundRect', ['X', 'Y', 'W', 'H', 'R'])
  generator.forBlock.oled_drawTriangle = draw('drawTriangle', ['X0', 'Y0', 'X1', 'Y1', 'X2', 'Y2'])
  generator.forBlock.oled_fillTriangle = draw('fillTriangle', ['X0', 'Y0', 'X1', 'Y1', 'X2', 'Y2'])

  generator.forBlock.oled_setText = (block) => {
    const size = fieldValue(block, 'SIZE', '1')
    const colour = fieldValue(block, 'COLOUR', 'SSD1306_WHITE')
    const background = fieldValue(block, 'BGCOLOR', 'SSD1306_BLACK')
    return `oled.setTextSize(${size});\noled.setTextColor(${colour}, ${background});\n`
  }

  generator.forBlock.oled_setCursor = (block) =>
    `oled.setCursor(${input(block, 'X', '0')}, ${input(block, 'Y', '0')});\n`

  generator.forBlock.oled_print = (block) => {
    const data = input(block, 'DATA', '""')
    const method = fieldValue(block, 'EOL', 'warp') === 'warp' ? 'println' : 'print'
    return `oled.${method}(${data});\n`
  }

  generator.forBlock.oled_clear = () => 'oled.clearDisplay();\n'

  generator.forBlock.oled_refresh = () => 'oled.display();\n'

  generator.forBlock.oled_startScroll = (block) => {
    const call = SCROLL_CALLS[fieldValue(block, 'TYPE', '0')] ?? SCROLL_CALLS['0']
    const y0 = fieldValue(block, 'Y0', '0x00')
    const y1 = fieldValue(block, 'Y1', '0x07')
    return `oled.${call}(${y0}, ${y1});\n`
  }

  generator.forBlock.oled_stopScroll = () => 'oled.stopscroll();\n'
}
