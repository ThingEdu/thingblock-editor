/**
 * PCA9685 Arduino codegen. One driver object declared from the init block's IIC address; servo mode
 * additionally declares the `PCA9685_ServoEval` that converts an angle to a pulse width.
 *
 * The servo-eval global is pushed by `setToServoMode` rather than by the angle setters, mirroring the
 * board's own requirement that servo mode is entered before any angle is written.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterGenerators } from '../../../shared/types'

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }

  generator.forBlock.pca9685_init = (block) => {
    const addr = generator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0'

    generator.includes.set('pca9685', '#include <PCA9685.h>')
    generator.globals.set('pca9685', `PCA9685 pca9685(${addr});`)

    return 'Wire.begin();\npca9685.resetDevices();\npca9685.init();\n'
  }

  generator.forBlock.pca9685_setToServoMode = () => {
    // 123/491 are the library's default min/max servo pulse counts at the servo PWM frequency.
    generator.globals.set('pca9685_servo', 'PCA9685_ServoEval pca9685Servo(123, 491);')
    return 'pca9685.setPWMFreqServo();\n'
  }

  generator.forBlock.pca9685_setServoAngle = (block) => {
    const ch = fieldValue(block, 'CH', '0')
    const angle = generator.valueToCode(block, 'ANGLE', Order.ATOMIC) || '90'
    return `pca9685.setChannelPWM(${ch}, pca9685Servo.pwmForAngle(${angle}));\n`
  }

  generator.forBlock.pca9685_setAllServoAngle = (block) => {
    const angle = generator.valueToCode(block, 'ANGLE', Order.ATOMIC) || '90'
    return `pca9685.setAllChannelsPWM(pca9685Servo.pwmForAngle(${angle}));\n`
  }

  generator.forBlock.pca9685_setPWMFrequency = (block) => {
    const freq = generator.valueToCode(block, 'FREQ', Order.ATOMIC) || '200'
    return `pca9685.setPWMFrequency(${freq});\n`
  }

  generator.forBlock.pca9685_setChannelPWM = (block) => {
    const ch = fieldValue(block, 'CH', '0')
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0'
    return `pca9685.setChannelPWM(${ch}, ${value});\n`
  }

  generator.forBlock.pca9685_setAllChannelPWM = (block) => {
    const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0'
    return `pca9685.setAllChannelsPWM(${value});\n`
  }
}
