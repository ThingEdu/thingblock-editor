import Cast from '../../util/cast';
import {RuntimeEventNames, type RuntimeEmitter} from '../../engine/runtime/runtime-events';

/** Internal names of the non-character Scratch keys. */
const KEY_NAME = {
    SPACE: 'space',
    LEFT: 'left arrow',
    UP: 'up arrow',
    RIGHT: 'right arrow',
    DOWN: 'down arrow',
    ENTER: 'enter'
} as const;

const KEY_NAME_LIST: string[] = Object.values(KEY_NAME);

export interface KeyboardData {
    key?: string
    isDown?: boolean
}

class Keyboard {
    events: RuntimeEmitter;
    /** Pressed Scratch keys: a `KEY_NAME` value or one uppercase character, never a modifier. */
    _keysPressed: string[] = [];

    constructor (events: RuntimeEmitter) {
        this.events = events;
    }

    /** Maps a DOM `KeyboardEvent.key` to a Scratch key, or '' for modifier keys. */
    _keyStringToScratchKey (keyString: unknown): string {
        const key = Cast.toString(keyString);
        switch (key) {
        case ' ': return KEY_NAME.SPACE;
        case 'ArrowLeft':
        case 'Left': return KEY_NAME.LEFT;
        case 'ArrowUp':
        case 'Up': return KEY_NAME.UP;
        case 'Right':
        case 'ArrowRight': return KEY_NAME.RIGHT;
        case 'Down':
        case 'ArrowDown': return KEY_NAME.DOWN;
        case 'Enter': return KEY_NAME.ENTER;
        }
        if (key.length > 1) return '';
        return key.toUpperCase();
    }

    /** Maps a block argument to a Scratch key; numbers are read as ASCII codes. */
    _keyArgToScratchKey (keyArg: unknown): string {
        if (typeof keyArg === 'number') {
            // Digits, some punctuation and uppercase letters
            if (keyArg >= 48 && keyArg <= 90) {
                return String.fromCharCode(keyArg);
            }
            switch (keyArg) {
            case 32: return KEY_NAME.SPACE;
            case 37: return KEY_NAME.LEFT;
            case 38: return KEY_NAME.UP;
            case 39: return KEY_NAME.RIGHT;
            case 40: return KEY_NAME.DOWN;
            }
        }

        let key = Cast.toString(keyArg);
        if (KEY_NAME_LIST.includes(key)) return key;
        if (key.length > 1) key = key[0];
        if (key === ' ') return KEY_NAME.SPACE;
        return key.toUpperCase();
    }

    postData (data: KeyboardData) {
        if (!data.key) return;
        const scratchKey = this._keyStringToScratchKey(data.key);
        if (scratchKey === '') return;
        const index = this._keysPressed.indexOf(scratchKey);
        if (data.isDown) {
            this.events.emit(RuntimeEventNames.KEY_PRESSED, scratchKey);
            if (index < 0) this._keysPressed.push(scratchKey);
        } else if (index > -1) {
            this._keysPressed.splice(index, 1);
        }
    }

    getKeyIsDown (keyArg: unknown): boolean {
        if (keyArg === 'any') return this._keysPressed.length > 0;
        return this._keysPressed.includes(this._keyArgToScratchKey(keyArg));
    }
}

export default Keyboard;
