/**
 * Ultrasonic distance sensor manifest. The Ultrasonic library source is vendored under `libs/`, so it
 * is declared as a vendored lib the helper resolves from its resource root at compile time — not a
 * registry lib it would install via arduino-cli.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'ultrasonic',
  kind: 'peripheral',
  name: 'Ultrasonic',
  icon: './icon.png',
  description: {
    id: 'peripheral.ultrasonic.description',
    default: 'Standard ultrasonic distance measurement module.',
    description: 'Description of the Ultrasonic peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  toolbox: './toolbox.js',
  libs: [{ path: 'libs/Ultrasonic' }],
}

export default manifest
