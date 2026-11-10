/**
 * Servo peripheral codegen. One `forBlock` function reads the block's pin/angle and pushes the
 * cross-cutting fragments (the `<Servo.h>` include, one `Servo` object per pin, and its `attach()` in
 * `setup()`) into the generator's keyed buckets, so N servo blocks on the same pin collapse to one
 * object and one attach.
 */
import type { RegisterGenerators } from '../../../shared/types'

const SERVO_INCLUDE = [
  '#if defined(ARDUINO_ARCH_ESP32)',
  '#include <ESP32Servo.h>',
  '#else',
  '#include <Servo.h>',
  '#endif',
].join('\n')

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  generator.forBlock.servo_setangle = (block) => {
    const pin = generator.valueToCode(block, 'PIN', Order.ATOMIC) || '9'
    const angle = generator.valueToCode(block, 'ANGLE', Order.NONE) || '90'
    const name = `servo_${pin}`
    // ESP32 boards need ESP32Servo (the Arduino Servo library has no working ESP32 support on core 3.x);
    // its `Servo` class has the same API, so only the header differs.
    generator.includes.set('servo', SERVO_INCLUDE)
    generator.globals.set(name, `Servo ${name};`)
    generator.setups.set(`${name}_attach`, `${name}.attach(${pin});`)
    return `${name}.write(${angle});\n`
  }
}
