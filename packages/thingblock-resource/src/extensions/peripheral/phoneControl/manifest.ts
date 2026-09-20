/**
 * Phone-control manifest. Turns a compiled program into a BLE peripheral speaking the same
 * ThingBot Telemetrix protocol as live mode, so the ThingBot remote app — or anything else
 * speaking that protocol — can drive motors, servos, the buzzer and the LEDs while the student's
 * own blocks keep running.
 *
 * The firmware sources are vendored under `libs/`, adapted from the standalone ThingBot
 * Telemetrix firmware: it owns the command table and pin state here instead of a `main.cpp`, and
 * it shares the sketch's own `pwm` object rather than constructing a second PCA9685 driver.
 */
import type { PeripheralManifest } from '../../../shared/types'

const manifest: PeripheralManifest = {
  id: 'phoneControl',
  kind: 'peripheral',
  name: 'Phone control',
  icon: './icon.svg',
  description: {
    id: 'peripheral.phoneControl.description',
    default: 'Let a phone drive the board over Bluetooth while the program runs.',
    description: 'Description of the phone-control peripheral',
  },
  blocks: './blocks.js',
  generator: './generator.js',
  toolbox: './toolbox.js',
  libs: [
    { path: 'libs/ThingBotTelemetrix' },
    { path: 'libs/Ultrasonic' },
    { path: 'libs/DHT_sensor_library' },
    { path: 'libs/Adafruit_Unified_Sensor' },
  ],
}

export default manifest
