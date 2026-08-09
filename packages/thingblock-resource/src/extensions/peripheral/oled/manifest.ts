/**
 * SSD1306 OLED display manifest. The Adafruit driver stack is vendored under `libs/` (the SSD1306
 * driver plus the GFX graphics core and BusIO it depend on), so all three are declared as vendored
 * libs the helper resolves from its resource root at compile time.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'oled',
  kind: 'peripheral',
  name: 'OLED',
  icon: './icon.png',
  description: {
    id: 'peripheral.oled.description',
    default: 'SSD1306 monochrome OLED display driven over I2C.',
    description: 'Description of the OLED peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  toolbox: './toolbox.js',
  libs: [{ path: 'libs/Adafruit_SSD1306' }, { path: 'libs/Adafruit_GFX_Library' }, { path: 'libs/Adafruit_BusIO' }],
}

export default manifest
