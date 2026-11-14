/**
 * Cobot IR sensor simulator codegen, call for call with `generator.ts`. The rig sets each reading: an IR
 * sensor on GPIO n is the board's `adc<n>` input.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import type { RegisterSimGenerators } from '../../../shared/types'

export const registerSimGenerators: RegisterSimGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }
  const level = (block: Block) => (fieldValue(block, 'STATE', 'HIGH') === 'LOW' ? 0 : 1)

  generator.forBlock.cobot_readIr = (block) => [
    `$.analogRead(${Number(fieldValue(block, 'PIN', '4')) || 0})`,
    Order.ATOMIC,
  ]
  generator.forBlock.cobot_irLight = (block) => `$.digitalWrite(21, ${level(block)});\n`
}
