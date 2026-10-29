import type {HatInfo, HatStarter} from '../engine/runtime';
import {IoEvent} from '../event/event-name';
import type {EventBus} from '../event/event-bus';

/** Hats for the green flag, key presses and the Arduino setup/loop entry points. */
class Scratch3EventBlocks {
    constructor (events: EventBus, hats: HatStarter) {
        events.on(IoEvent.KEY_PRESSED, key => {
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
