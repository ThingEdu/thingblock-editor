/**
 * PCA9685 16-channel PWM driver manifest. The PCA9685 library source is vendored under `libs/`, so it
 * is declared as a vendored lib the helper resolves from its resource root at compile time.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'pca9685',
  kind: 'peripheral',
  name: 'PCA9685 Module',
  icon: './icon.png',
  description: {
    id: 'peripheral.pca9685.description',
    default: 'The 16 channel PWM driver module based on PCA9685, uses IIC bus for communication.',
    description: 'Description of the PCA9685 peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  toolbox: './toolbox.js',
  libs: [{ path: 'libs/PCA9685_16-Channel_PWM_Driver_Module_Library' }],
}

export default manifest
