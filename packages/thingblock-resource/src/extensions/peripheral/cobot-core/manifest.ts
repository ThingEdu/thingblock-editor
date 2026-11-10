/**
 * CoBot's device-exclusive peripheral, published hidden so it never appears in the peripheral library;
 * the CoBot device activates it by id when selected. It owns the board's two motors, its four line eyes
 * and its two lights. Pin numbers and motor settings come from makerviet/cobot-arduino (commit 4854f9c)
 * and its BASE schematic; that repo carries no licence file, so none of its code is copied.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'cobotC3',
  kind: 'peripheral',
  name: 'CoBot',
  hidden: true,
  blocks: './blocks.js',
  generator: './generator.js',
  toolbox: './toolbox.js',
}

export default manifest
