import arduinoUno from './arduino-uno';
import arduinoNano from './arduino-nano';
import esp32 from './esp32';
import esp32c3 from './esp32-c3';
import type Device from '../../devices/device';
import type Runtime from '../../engine/runtime';

/** A built-in board: presentation data plus the `Device` the runtime constructs and registers. */
export interface BoardManifest {
    id: string
    iconURL: string
    Device: new (runtime: Runtime) => Device
}

/**
 * Every board manifest. Boards that inherit everything from the common-board layer carry only
 * presentation and `Device` data. `deviceClasses` is the flat list the runtime constructs and registers
 * in the DeviceRegistry.
 */
export const boards: BoardManifest[] = [
    arduinoUno,
    arduinoNano,
    esp32,
    esp32c3
];

export const deviceClasses = boards.map(board => board.Device);
