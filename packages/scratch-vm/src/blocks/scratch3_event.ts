import type {HatInfo, HatStarter} from '../engine/runtime';
import {RuntimeEventNames, type RuntimeEmitter} from '../engine/runtime/runtime-events';

/** Hats for the green flag, key presses and the Arduino setup/loop entry points. */
class Scratch3EventBlocks {
    constructor (events: RuntimeEmitter, hats: HatStarter) {
        events.on(RuntimeEventNames.KEY_PRESSED, key => {
            hats.startHats('event_whenkeypressed', {KEY_OPTION: key});
            hats.startHats('event_whenkeypressed', {KEY_OPTION: 'any'});
        });
    }

    getHats (): Record<string, HatInfo> {
        return {
            event_whenflagclicked: {
                restartExistingThreads: true
            },
            event_whenkeypressed: {
                restartExistingThreads: false
            },
            event_whenarduinobegin: {
                restartExistingThreads: true
            },
            event_whenarduinoloop: {
                restartExistingThreads: true
            }
        };
    }
}

export default Scratch3EventBlocks;
