import Esp32C3 from './device';
import iconURL from './assets/icon.svg';
import type {BoardManifest} from '..';

/**
 * ESP32-C3 Dev Module board manifest. Data only — it inherits the standard Arduino API from the
 * common-board layer. ESP32-C3-specific blocks would be added here; codegen overrides live in
 * scratch-blocks (a resource pack registering against the Blockly ArduinoGenerator).
 */
const manifest: BoardManifest = {
    id: 'esp32c3',
    iconURL,
    // Retired from the board picker in 0.6: ThingBlock ships for ThingBot (itself an ESP32-C3) and
    // VIA Banh Mi. Old ESP32-C3 projects still load and build.
    hidden: true,
    Device: Esp32C3
};

export default manifest;
