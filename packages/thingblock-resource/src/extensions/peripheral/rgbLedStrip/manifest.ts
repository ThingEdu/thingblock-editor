/**
 * RGB LED strip (WS2812/NeoPixel) manifest. The Adafruit NeoPixel library is vendored under `libs/`,
 * so it is declared as a vendored lib the helper resolves from its resource root at compile time.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'rgbLedStrip',
  kind: 'peripheral',
  name: 'RGB LED Strip',
  icon: './icon.png',
  description: {
    id: 'peripheral.rgbLedStrip.description',
    default: 'Single-wire-based RGB LED pixels and strip.',
    description: 'Description of the RGB LED strip peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  toolbox: './toolbox.js',
  libs: [{ path: 'libs/Adafruit_NeoPixel' }],
}

export default manifest
