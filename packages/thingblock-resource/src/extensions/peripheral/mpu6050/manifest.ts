/**
 * MPU6050 6-axis attitude sensor manifest. The Adafruit driver stack is vendored under `libs/`
 * (the MPU6050 driver plus the BusIO and Unified Sensor libraries it depends on), so all three are
 * declared as vendored libs the helper resolves from its resource root at compile time.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'mpu6050',
  kind: 'peripheral',
  name: 'MPU6050 Sensor',
  icon: './icon.png',
  description: {
    id: 'peripheral.mpu6050.description',
    default: '6-axis attitude sensor module based on MPU6050.',
    description: 'Description of the MPU6050 peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  toolbox: './toolbox.js',
  libs: [
    { path: 'libs/Adafruit_MPU6050' },
    { path: 'libs/Adafruit_BusIO' },
    { path: 'libs/Adafruit_Unified_Sensor' },
  ],
}

export default manifest
