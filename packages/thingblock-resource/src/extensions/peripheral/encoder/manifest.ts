/**
 * Rotary encoder manifest. A quadrature encoder (A/B phases plus a push button) read through pin-change
 * interrupts; the codegen is self-contained, so the pack vendors no library.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'encoder',
  kind: 'peripheral',
  name: 'Rotary Encoder',
  icon: './icon.png',
  description: {
    id: 'peripheral.encoder.description',
    default: 'Rotary encoder knob with a push button: count turns and read presses.',
    description: 'Description of the Rotary Encoder peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  toolbox: './toolbox.js',
}

export default manifest
