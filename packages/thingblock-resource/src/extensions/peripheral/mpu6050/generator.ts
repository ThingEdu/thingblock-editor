/**
 * MPU6050 Arduino codegen. `mpu6050_readData` latches one sample into the shared `sensors_event_t`
 * globals; the reporters read fields off that latched sample rather than polling the sensor again,
 * so acceleration/rotation/temperature within a pass are all from the same instant.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterGenerators } from '../../../shared/types'

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }

  generator.forBlock.mpu6050_init = (block) => {
    const ar = fieldValue(block, 'AR', 'MPU6050_RANGE_8_G')
    const gr = fieldValue(block, 'GR', 'MPU6050_RANGE_500_DEG')
    const fb = fieldValue(block, 'FB', 'MPU6050_BAND_21_HZ')

    generator.includes.set(
      'mpu6050',
      '#include <Adafruit_MPU6050.h>\n#include <Adafruit_Sensor.h>\n#include <Wire.h>',
    )
    generator.globals.set('mpu6050', 'Adafruit_MPU6050 mpu6050;\nsensors_event_t mpu6050_a, mpu6050_g, mpu6050_temp;')

    return (
      `mpu6050.begin();\nmpu6050.setAccelerometerRange(${ar});\n` +
      `mpu6050.setGyroRange(${gr});\nmpu6050.setFilterBandwidth(${fb});\n`
    )
  }

  generator.forBlock.mpu6050_readData = () => 'mpu6050.getEvent(&mpu6050_a, &mpu6050_g, &mpu6050_temp);\n'

  generator.forBlock.mpu6050_acceleration = (block) => {
    const axis = fieldValue(block, 'AXIS', 'x')
    return [`mpu6050_a.acceleration.${axis}`, Order.ATOMIC]
  }

  generator.forBlock.mpu6050_gyro = (block) => {
    const axis = fieldValue(block, 'AXIS', 'x')
    return [`mpu6050_g.gyro.${axis}`, Order.ATOMIC]
  }

  generator.forBlock.mpu6050_temperature = () => ['mpu6050_temp.temperature', Order.ATOMIC]
}
