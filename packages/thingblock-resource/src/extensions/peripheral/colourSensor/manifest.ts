/**
 * TCS34725 colour sensor on the I2C bus (address 0x29). It works on any board: it uses the board's
 * default `Wire` pins, which on the ThingBot and the CoBot are SDA IO8 and SCL IO9. The CoBot activates
 * it itself, since the sensor sits under its chassis. The Adafruit TCS34725 driver 1.4.2 (BSD) and
 * Adafruit BusIO 1.7.1 (MIT) are vendored under `libs/` verbatim.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'colourSensor',
  kind: 'peripheral',
  name: 'Colour Sensor (I2C)',
  description: {
    id: 'peripheral.colourSensor.description',
    default: 'TCS34725 colour sensor on I2C: red, green, blue and brightness readings, and the colour it sees.',
    description: 'Description of the colour sensor peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  sim: './sim.js',
  toolbox: './toolbox.js',
  libs: [{ path: 'libs/Adafruit_TCS34725' }, { path: 'libs/Adafruit_BusIO' }],
}

export default manifest
