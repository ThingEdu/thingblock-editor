import ArduinoNano from './device';
import iconURL from './assets/icon.svg';
import type {BoardManifest} from '..';

/**
 * Arduino Nano board manifest. Data only — it inherits the standard Arduino API blocks from the
 * common-board layer, so it needs no Extension of its own.
 */
const manifest: BoardManifest = {
    id: 'arduinoNano',
    iconURL,
    Device: ArduinoNano
};

export default manifest;
