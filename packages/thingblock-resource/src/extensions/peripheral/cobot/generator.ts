/**
 * Cobot IR sensor Arduino codegen, after makerviet/cobot-arduino `cobot_simple_line_following`: the IR
 * sensors are plain `analogRead`s (0–4095 on the ESP32-C3) and IO21 powers the IR emitters.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import type { RegisterGenerators } from '../../../shared/types'

export const IR_LED_PIN = 21

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
    generator.setups.set(
      'cobot_ir_light',
      `pinMode(${IR_LED_PIN}, OUTPUT);  // IO${IR_LED_PIN} cấp điện cho đèn hồng ngoại của các mắt trên xe Cobot`,
    )
    return `digitalWrite(${IR_LED_PIN}, ${level(block)});\n`
  }
}
