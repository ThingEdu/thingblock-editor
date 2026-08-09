/**
 * MPU6050 blocks: init (accelerometer/gyro range and filter bandwidth), a data read that latches one
 * sample, and reporters for the latched acceleration, rotation, and temperature.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterBlocks } from '../../../shared/types'

const COLOUR = '#0066CC'
const SECONDARY_COLOUR = '#005AB5'

const AXIS_OPTIONS: [string, string][] = [
  ['x', 'x'],
  ['y', 'y'],
  ['z', 'z'],
]

export const registerBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.mpu6050_init = {
    init(this: Block) {
      this.jsonInit({
        message0: 'init mpu6050 accelerometer range %1 gyro range %2 filter bandwidth %3',
        args0: [
          {
            type: 'field_dropdown',
            name: 'AR',
            options: [
              ['2G', 'MPU6050_RANGE_2_G'],
              ['4G', 'MPU6050_RANGE_4_G'],
              ['8G', 'MPU6050_RANGE_8_G'],
              ['16G', 'MPU6050_RANGE_16_G'],
            ],
          },
          {
            type: 'field_dropdown',
            name: 'GR',
            options: [
              ['250°/s', 'MPU6050_RANGE_250_DEG'],
              ['500°/s', 'MPU6050_RANGE_500_DEG'],
              ['1000°/s', 'MPU6050_RANGE_1000_DEG'],
              ['2000°/s', 'MPU6050_RANGE_2000_DEG'],
            ],
          },
          {
            type: 'field_dropdown',
            name: 'FB',
            options: [
              ['260Hz', 'MPU6050_BAND_260_HZ'],
              ['184Hz', 'MPU6050_BAND_184_HZ'],
              ['94Hz', 'MPU6050_BAND_94_HZ'],
              ['44Hz', 'MPU6050_BAND_44_HZ'],
              ['21Hz', 'MPU6050_BAND_21_HZ'],
              ['10Hz', 'MPU6050_BAND_10_HZ'],
              ['5Hz', 'MPU6050_BAND_5_HZ'],
            ],
          },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.mpu6050_readData = {
    init(this: Block) {
      this.jsonInit({
        message0: 'mpu6050 read data',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.mpu6050_acceleration = {
    init(this: Block) {
      this.jsonInit({
        message0: 'mpu6050 %1 axis acceleration (m/s^2)',
        args0: [{ type: 'field_dropdown', name: 'AXIS', options: AXIS_OPTIONS }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_number'],
      })
    },
  }

  Blockly.Blocks.mpu6050_gyro = {
    init(this: Block) {
      this.jsonInit({
        message0: 'mpu6050 %1 axis rotation (rad/s)',
        args0: [{ type: 'field_dropdown', name: 'AXIS', options: AXIS_OPTIONS }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_number'],
      })
    },
  }

  Blockly.Blocks.mpu6050_temperature = {
    init(this: Block) {
      this.jsonInit({
        message0: 'mpu6050 temperature (℃)',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_number'],
      })
    },
  }
}
