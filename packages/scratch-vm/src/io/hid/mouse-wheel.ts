import type {HatStarter} from '../../engine/runtime';

export interface MouseWheelData {
    deltaY: number
}

/** Scrolling fires the up/down arrow key hats, as in Scratch 2. */
class MouseWheel {
    hats: HatStarter;

    constructor (hats: HatStarter) {
        this.hats = hats;
    }

    postData (data: MouseWheelData) {
        let key: string;
        if (data.deltaY < 0) {
            key = 'up arrow';
        } else if (data.deltaY > 0) {
            key = 'down arrow';
        } else {
            return;
        }
        this.hats.startHats('event_whenkeypressed', {KEY_OPTION: key});
    }
}

export default MouseWheel;
