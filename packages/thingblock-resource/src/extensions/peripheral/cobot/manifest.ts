/**
 * Cobot sensors manifest: four analog IR reflectance sensors and a TCS34725 colour sensor, wired as on
 * the ThingEdu Cobot. Only the pin numbers and sensor settings are taken from makerviet/cobot-arduino
 * (commit 4854f9c; the repo carries no licence file, so no code is copied). The Adafruit TCS34725 driver
 * 1.4.2 (BSD) and Adafruit BusIO 1.7.1 (MIT) are vendored under `libs/` verbatim.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'cobot',
  kind: 'peripheral',
  name: 'Cobot sensors',
  description: {
    id: 'peripheral.cobot.description',
    default: 'Cobot IR line sensors and TCS34725 colour sensor.',
    description: 'Description of the Cobot sensors peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  sim: './sim.js',
  toolbox: './toolbox.js',
  libs: [{ path: 'libs/Adafruit_TCS34725' }, { path: 'libs/Adafruit_BusIO' }],
}

export default manifest
