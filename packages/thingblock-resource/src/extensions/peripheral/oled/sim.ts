/**
 * OLED simulator codegen: the same driver calls as `generator.ts`, on the simulator's virtual
 * SSD1306, whose drawing and text follow Adafruit_GFX pixel for pixel. Printed values are formatted
 * by their C++ type, as `Print::print` overloads would format them.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterSimGenerators } from '../../../shared/types'

const COLOURS = 'const SSD1306_BLACK = 0, SSD1306_WHITE = 1, SSD1306_INVERSE = 2;'

export const registerSimGenerators: RegisterSimGenerators = (generator) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }
  /** A colour menu value, kept to the three names the driver defines. */
  const colour = (block: Block, name: string, fallback: string): string => {
    const value = fieldValue(block, name, fallback)
    return ['SSD1306_BLACK', 'SSD1306_WHITE', 'SSD1306_INVERSE'].includes(value) ? value : fallback
  }

  generator.forBlock.oled_init = (block) => {
    const w = generator.inputAs(block, 'W', 'int', '128')
    const h = generator.inputAs(block, 'H', 'int', '64')
    // The SH1106 driver shares the SSD1306 drawing API and buffer layout, so one model serves both.
    generator.globals.set('oled', `${COLOURS}\nconst oled = $.hw.Adafruit_SSD1306(${w}, ${h});`)
    return 'oled.begin();\noled.setTextColor(SSD1306_WHITE);'
  }

  generator.forBlock.oled_setText = (block) => {
    const size = Number(fieldValue(block, 'SIZE', '1')) || 1
    const fg = colour(block, 'COLOUR', 'SSD1306_WHITE')
    const bg = colour(block, 'BGCOLOR', 'SSD1306_BLACK')
    return `oled.setTextSize(${size});\noled.setTextColor(${fg}, ${bg});`
  }

  generator.forBlock.oled_setCursor = (block) =>
    `oled.setCursor(${generator.inputAs(block, 'X', 'int')}, ${generator.inputAs(block, 'Y', 'int')});`

  generator.forBlock.oled_print = (block) => {
    const { code, type } = generator.typedInput(block, 'DATA', '""', 'cstr')
    const method = fieldValue(block, 'EOL', 'warp') === 'warp' ? 'println' : 'print'
    return `oled.${method}(${generator.printable(code, type)});`
  }

  generator.forBlock.oled_clear = () => 'oled.clearDisplay();'
  generator.forBlock.oled_refresh = () => 'oled.display();'

  generator.forBlock.oled_fillRect = (block) => {
    const [x, y, w, h] = ['X', 'Y', 'W', 'H'].map((name) => generator.inputAs(block, name, 'int'))
    return `oled.fillRect(${x}, ${y}, ${w}, ${h}, ${colour(block, 'COLOUR', 'SSD1306_WHITE')});`
  }
  generator.forBlock.oled_drawRect = (block) => {
    const [x, y, w, h] = ['X', 'Y', 'W', 'H'].map((name) => generator.inputAs(block, name, 'int'))
    return `oled.drawRect(${x}, ${y}, ${w}, ${h}, ${colour(block, 'COLOUR', 'SSD1306_WHITE')});`
  }
}
