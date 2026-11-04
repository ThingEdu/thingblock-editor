/**
 * Servo peripheral manifest. The Servo library source is vendored under `libs/`, so it is declared as a
 * vendored lib the helper resolves from its resource root at compile time — not a registry lib it would
 * install via arduino-cli.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'servo',
  kind: 'peripheral',
  name: 'Servo',
  icon: './icon.svg',
  description: {
    id: 'peripheral.servo.description',
    default: 'A hobby servo motor you drive to a target angle.',
    description: 'Description of the Servo peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  toolbox: './toolbox.js',
  // Servo for AVR boards, ESP32Servo (LGPL-2.1) for ESP32 boards; the sketch includes the one its board needs.
  libs: [{ path: 'libs/Servo' }, { path: 'libs/ESP32Servo' }],
}

export default manifest
