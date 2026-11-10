import Esp32 from './device';
import iconURL from './assets/icon.svg';
import type {BoardManifest} from '..';

/**
 * ESP32 Dev Module board manifest. Data only for now — it inherits the standard Arduino API from
 * the common-board layer. ESP32-specific blocks would be added here; ESP32 codegen overrides live
 * in scratch-blocks (a resource pack registering against the Blockly ArduinoGenerator).
 */
const manifest: BoardManifest = {
    id: 'esp32',
    iconURL,
    // Retired from the board picker in 0.6: ThingBlock ships for ThingBot and ESP32-C3 boards.
    hidden: true,
    Device: Esp32
};

export default manifest;
