/**
 * Ultrasonic simulator codegen: the same `Ultrasonic` object per TRIG/ECHO pair as `generator.ts`, on
 * the simulator's virtual sensor, which reports the distance set on the panel's slider.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import type { RegisterSimGenerators } from '../../../shared/types'

/** The library's unit divisors, as `Ultrasonic.h` defines `CM` and `INC`. */
const UNITS = 'const CM = 28, INC = 71;'

export const registerSimGenerators: RegisterSimGenerators = (generator, Order) => {
  const pin = (block: Block, name: string, fallback: number): number => {
    const value = Number(block.getFieldValue(name))
    return Number.isInteger(value) && value >= 0 ? value : fallback
  }

  generator.forBlock.ultrasonic_readDistance = (block) => {
    const trig = pin(block, 'TRIG', 2)
    const echo = pin(block, 'ECHO', 3)
    const unit = block.getFieldValue('UNIT') === 'INC' ? 'INC' : 'CM'
    const name = `ultrasonic_${trig}_${echo}`
    generator.globals.set('ultrasonic_units', UNITS)
    generator.globals.set(name, `const ${name} = $.hw.Ultrasonic(${trig}, ${echo});`)
    return [`${name}.read(${unit})`, Order.ATOMIC]
  }
  // `read()` returns an `unsigned int`.
  generator.typeFor.ultrasonic_readDistance = () => 'int'
}
