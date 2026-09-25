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
    Device: ArduinoUno
};

export default manifest;
