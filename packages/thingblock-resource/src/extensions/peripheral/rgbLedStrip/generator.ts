/**
 * RGB LED strip Arduino codegen against Adafruit_NeoPixel. The strip object is declared once from the
 * init block's length and pin; every later block drives that single `ledStrip` instance.
 *
 * Pixel indices are 1-based in the palette (a Scratch convention) and 0-based in the library, so the
 * setters emit an explicit `- 1`.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterGenerators } from '../../../shared/types'

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }

  generator.forBlock.rgbLedStrip_init = (block) => {
    const len = generator.valueToCode(block, 'LEN', Order.ATOMIC) || '16'
    const pin = fieldValue(block, 'PIN', '2')

    generator.includes.set('rgbLedStrip', '#include <Adafruit_NeoPixel.h>')
    generator.globals.set('rgbLedStrip', `Adafruit_NeoPixel ledStrip(${len}, ${pin}, NEO_GRB + NEO_KHZ800);`)

    return 'ledStrip.begin();\n'
  }

  generator.forBlock.rgbLedStrip_setPixelColor = (block) => {
    const no = generator.valueToCode(block, 'NO', Order.ATOMIC) || '1'
    const colour = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || '0x000000'
    return `ledStrip.setPixelColor(${no} - 1, ${colour});\n`
  }

  generator.forBlock.rgbLedStrip_fill = (block) => {
    const first = generator.valueToCode(block, 'FIRST', Order.ATOMIC) || '1'
    const count = generator.valueToCode(block, 'COUNT', Order.ATOMIC) || '1'
    const colour = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || '0x000000'
    return `ledStrip.fill(${colour}, ${first} - 1, ${count});\n`
  }

  generator.forBlock.rgbLedStrip_color = (block) => {
    const r = generator.valueToCode(block, 'R', Order.ATOMIC) || '0'
    const g = generator.valueToCode(block, 'G', Order.ATOMIC) || '0'
    const b = generator.valueToCode(block, 'B', Order.ATOMIC) || '0'
    return [`ledStrip.Color(${r}, ${g}, ${b})`, Order.ATOMIC]
  }

  generator.forBlock.rgbLedStrip_setBrightness = (block) => {
    const brightness = generator.valueToCode(block, 'BRT', Order.ATOMIC) || '255'
    return `ledStrip.setBrightness(${brightness});\n`
  }

  generator.forBlock.rgbLedStrip_clear = () => 'ledStrip.clear();\n'

  generator.forBlock.rgbLedStrip_show = () => 'ledStrip.show();\n'
}
