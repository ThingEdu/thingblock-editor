/**
 * Ultrasonic sensor Arduino codegen. One `Ultrasonic` instance per TRIG/ECHO pin pair, so two blocks
 * reading the same pins collapse to one global object.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterGenerators } from '../../../shared/types'

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }

  generator.forBlock.ultrasonic_readDistance = (block) => {
    const trig = fieldValue(block, 'TRIG', '2')
    const echo = fieldValue(block, 'ECHO', '3')
    const unit = fieldValue(block, 'UNIT', 'CM')
    const name = `ultrasonic_${trig}_${echo}`

    generator.includes.set('ultrasonic', '#include <Ultrasonic.h>')
    generator.globals.set(name, `Ultrasonic ${name}(${trig}, ${echo});`)

    return [`${name}.read(${unit})`, Order.ATOMIC]
  }
}
