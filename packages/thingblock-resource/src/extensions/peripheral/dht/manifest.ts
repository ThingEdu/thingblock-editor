/**
 * DHT temperature/humidity sensor manifest. The DHT sensor library source is vendored under `libs/`,
 * so it is declared as a vendored lib the helper resolves from its resource root at compile time — not
 * a registry lib it would install via arduino-cli.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'dht',
  kind: 'peripheral',
  name: 'DHT Sensor',
  icon: './icon.png',
  description: {
    id: 'peripheral.dht.description',
    default: 'DHT temperature and humidity sensor module.',
    description: 'Description of the DHT peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  toolbox: './toolbox.js',
  libs: [{ path: 'libs/DHT_sensor_library' }],
}

export default manifest
