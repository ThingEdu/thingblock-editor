import ArduinoUno from './device';
import iconURL from './assets/icon.svg';
import type {BoardManifest} from '..';

/**
 * Arduino Uno board manifest. Data only — it inherits the standard Arduino API blocks from the
 * common-board layer, so it needs no Extension of its own.
 */
const manifest: BoardManifest = {
    id: 'arduinoUno',
    iconURL,
    // Retired from the board picker in 0.6: ThingBlock ships for ThingBot and ESP32-C3 boards.
    hidden: true,
    Device: ArduinoUno
};

export default manifest;
