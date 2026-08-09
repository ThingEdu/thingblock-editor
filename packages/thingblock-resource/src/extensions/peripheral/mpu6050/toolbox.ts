/** Toolbox category for the MPU6050 6-axis sensor peripheral. */
import type { ToolboxCategory } from '../../../shared/types'

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'MPU6050',
  colour: '#0066CC',
  contents: [
    { kind: 'block', type: 'mpu6050_init' },
    { kind: 'block', type: 'mpu6050_readData' },
    { kind: 'block', type: 'mpu6050_acceleration' },
    { kind: 'block', type: 'mpu6050_gyro' },
    { kind: 'block', type: 'mpu6050_temperature' },
  ],
}

export default toolbox
