/**
 * Cobot sensor Arduino codegen, after makerviet/cobot-arduino `cobot_simple_line_following`: the IR
 * sensors are plain `analogRead`s (0–4095 on the ESP32-C3), IO21 powers the IR emitters, IO20 the white
 * LED beside the colour sensor, and the TCS34725 is read raw with the sketch's integration time and gain.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import type { RegisterGenerators } from '../../../shared/types'

export const IR_LED_PIN = 21
export const WHITE_LED_PIN = 20

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }
  const level = (block: Block) => (fieldValue(block, 'STATE', 'HIGH') === 'LOW' ? 'LOW' : 'HIGH')

  generator.forBlock.cobot_readIr = (block) => [
    `analogRead(${Number(fieldValue(block, 'PIN', '4')) || 0})`,
    Order.ATOMIC,
  ]

  generator.forBlock.cobot_irLight = (block) => {
    generator.setups.set('cobot_ir_light', `pinMode(${IR_LED_PIN}, OUTPUT);`)
    return `digitalWrite(${IR_LED_PIN}, ${level(block)});\n`
  }

  generator.forBlock.cobot_colourLight = (block) => {
    generator.setups.set('cobot_colour_light', `pinMode(${WHITE_LED_PIN}, OUTPUT);`)
    return `digitalWrite(${WHITE_LED_PIN}, ${level(block)});\n`
  }

  generator.forBlock.cobot_readColour = (block) => {
    const channel = Math.min(3, Math.max(0, Number(fieldValue(block, 'CHANNEL', '3')) || 0))
    generator.includes.set('cobot_colour', '#include <Wire.h>\n#include <Adafruit_TCS34725.h>')
    generator.globals.set(
      'cobot_colour',
      [
        'Adafruit_TCS34725 cobotTcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);',
        'uint16_t cobotColour(uint8_t channel) {',
        '\tuint16_t rgbc[4];',
        '\tcobotTcs.getRawData(&rgbc[0], &rgbc[1], &rgbc[2], &rgbc[3]);',
        '\treturn rgbc[channel];',
        '}',
      ].join('\n'),
    )
    generator.setups.set('cobot_colour', 'cobotTcs.begin();')
    return [`cobotColour(${channel})`, Order.ATOMIC]
  }
}
