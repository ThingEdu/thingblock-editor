/**
 * Cobot IR sensors manifest: four analog IR reflectance sensors wired as on the ThingEdu Cobot, readable
 * from any board (the ThingBot reads one plugged into its sensor port). Only the pin numbers are taken
 * from makerviet/cobot-arduino (commit 4854f9c; the repo carries no licence file, so no code is copied).
 * The Cobot's colour sensor is the `colourSensor` pack.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'cobot',
  kind: 'peripheral',
  name: 'Cobot IR sensors',
  description: {
    id: 'peripheral.cobot.description',
    default: 'Cobot IR line sensors.',
    description: 'Description of the Cobot sensors peripheral',
  },
  icon: './icon.svg',
  blocks: './blocks.js',
  generator: './generator.js',
  sim: './sim.js',
  toolbox: './toolbox.js',
}

export default manifest
