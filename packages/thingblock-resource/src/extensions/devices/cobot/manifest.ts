/**
 * CoBot device manifest: the line-following robot of the Maker Village (Làng Maker), built by ThingEdu
 * with open Arduino samples from MakerViet (makerviet/cobot-arduino, commit 4854f9c). It is an ESP32-C3
 * (WT32C3-S5 module) on the built-in USB Serial/JTAG, so it is built with `CDCOnBoot=cdc` for `Serial`
 * to reach the Monitor, as the samples' README asks ("USB CDC On Boot: Enabled"). Its base carries two
 * N20 motors, four QRE1113 line eyes and a TCS34725 colour sensor on I2C (SDA IO8, SCL IO9).
 *
 * The hidden `cobotC3` peripheral is its programming surface; `colourSensor` is the reusable colour
 * sensor pack, active by default because the sensor is part of the base. No live-mode firmware exists
 * for this board, so the pack ships none.
 */
import type { DeviceManifest } from '../../../shared/types'

const manifest: DeviceManifest = {
  id: 'cobot',
  kind: 'device',
  name: 'CoBot',
  fqbn: 'esp32:esp32:esp32c3',
  icon: './assets/icon.svg',
  description: {
    id: 'device.cobot.description',
    default:
      'The Maker Village line-following robot: an ESP32-C3 with two motors, four line eyes and an I2C colour sensor.',
    description: 'Description of the CoBot device',
  },
  manufacturer: 'ThingEdu · MakerViet',
  requires: 'serial',
  learnMore: 'https://github.com/makerviet/cobot-arduino',
  extensions: ['cobotC3', 'colourSensor'],
  compile: { options: { CDCOnBoot: 'cdc' } },
  upload: {
    pnpid: ['USB\\VID_303A&PID_1001'],
    uploadSpeed: 921600,
  },
}

export default manifest
