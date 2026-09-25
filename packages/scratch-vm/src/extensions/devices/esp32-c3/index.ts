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
    Device: Esp32C3
};

export default manifest;
