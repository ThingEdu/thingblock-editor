import ArgumentType from '../../extension-support/argument-type';
import BlockType from '../../extension-support/block-type';
import formatMessage from 'format-message';
import {CameraAiEvent, RuntimeEvent} from '../../event/event-name';
import type {Extension, ExtensionInfo, MenuItem} from '../extension';
import {GESTURES, HAND_SELECTORS, VisionState, toGesture, toSelector} from './vision-state';
import type {VisionResults} from './vision-state';
import {Playground} from './playground';
import type {ObjectKind, PlaygroundState} from './playground';

// A block argument as Scratch delivers it: a field's string, or a reporter's number.
type ArgValue = string | number;

// eslint-disable-next-line @stylistic/max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHJ4PSI4IiBmaWxsPSIjN2MzYWVkIi8+CiAgPGcgc3Ryb2tlPSJ3aGl0ZSIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiPgogICAgPHJlY3QgeD0iNyIgeT0iMTMiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNSIgcng9IjMiLz4KICAgIDxwYXRoIGQ9Ik0yNyAxOGw3LTR2MTJsLTctNHoiLz4KICAgIDxjaXJjbGUgY3g9IjE3IiBjeT0iMjAuNSIgcj0iNCIvPgogIDwvZz4KPC9zdmc+Cg==';

export const EXTENSION_ID = 'cameraAi';

const msg = (id: string, def: string, description: string) =>
    formatMessage({id: `cameraAi.${id}`, default: def, description});

const item = (value: string, id: string, def: string): MenuItem => ({
    value,
    text: msg(`menu.${id}`, def, `Menu item: ${def}`)
});

/**
 * Camera AI: blocks that see the learner through the webcam and play on a small stage beside the
 * simulator. The blocks run on the computer; the GUI's playground panel runs the camera and the
 * hand tracker and sends every frame's results here. Nothing in this extension generates code
 * for a board.
 *
 * The hats are event hats, not edge-activated predicates: the extension starts them itself when a
 * gesture appears, the camera becomes ready or the countdown ends. (An edge-activated hat keeps a
 * thread alive every frame, which shows the project as running before Run is pressed.)
 */
class CameraAiExtension implements Extension {
    runtime;
    vision: VisionState;
    playground: Playground;
    // Whether each hand selector showed each gesture on the last frame, keyed `selector/gesture`.
    _gestureState: Record<string, boolean> = {};
    _wasReady = false;

    constructor (runtime: any) { // TODO: type Runtime for extension
        this.runtime = runtime;
        this.vision = new VisionState();
        this.playground = new Playground(
            state => this._emitPlayground(state),
            () => this._startHats('whenTimeUp')
        );

        this.runtime.events.on(CameraAiEvent.VISION_RESULTS, (results: VisionResults) => {
            this.vision.update(results);
            this._fireGestureHats();
        });
        this.runtime.events.on(CameraAiEvent.CAMERA_STATUS, (status: {on: boolean, ready: boolean}) => {
            this.vision.setCamera(Boolean(status.on), Boolean(status.ready));
            if (!status.on) this._gestureState = {};
            const ready = this.vision.cameraReady;
            if (ready && !this._wasReady) this._startHats('whenCameraReady');
            this._wasReady = ready;
        });
        this.runtime.events.on(RuntimeEvent.PROJECT_STOP_ALL, () => this.playground.stop());
        this.runtime.events.on(CameraAiEvent.PLAYGROUND_COMMAND, (command: {type: string}) => {
            if (command.type === 'reset') this.playground.reset();
        });
    }

    _emitPlayground (state: PlaygroundState) {
        this.runtime.events.emit(CameraAiEvent.PLAYGROUND_UPDATE, state);
    }

    _startHats (opcode: string, fields: Record<string, string> = {}) {
        this.runtime.startHats(`${EXTENSION_ID}_${opcode}`, fields);
    }

    // A "when … shows …" hat runs once each time its gesture appears on its hand.
    _fireGestureHats () {
        const next: Record<string, boolean> = {};
        for (const selector of HAND_SELECTORS) {
            const hands = this.vision.handsMatching(selector);
            for (const gesture of GESTURES) {
                const key = `${selector}/${gesture}`;
                next[key] = hands.some(h => h.gesture === gesture);
                if (next[key] && !this._gestureState[key]) {
                    this._startHats('whenGesture', {HAND: selector, GESTURE: gesture});
                }
            }
        }
        this._gestureState = next;
    }

    // ─── Extension metadata ───

    getInfo (): ExtensionInfo {
        return {
            id: EXTENSION_ID,
            name: msg('name', 'Camera AI', 'Name of the Camera AI extension'),
            blockIconURI,
            color1: '#7c3aed',
            color2: '#6d28d9',
            color3: '#5b21b6',
            blocks: [
                // ── Camera ──
                {
                    opcode: 'cameraOn',
                    blockType: BlockType.COMMAND,
                    text: msg('cameraOn', 'turn camera on [MIRROR]', 'Start the webcam'),
                    arguments: {
                        MIRROR: {type: ArgumentType.STRING, menu: 'MIRROR', defaultValue: 'mirror'}
                    }
                },
                {
                    opcode: 'cameraOff',
                    blockType: BlockType.COMMAND,
                    text: msg('cameraOff', 'turn camera off', 'Stop the webcam')
                },
                {
                    opcode: 'whenCameraReady',
                    blockType: BlockType.HAT,
                    isEdgeActivated: false,
                    text: msg('whenCameraReady', 'when camera is ready', 'Hat: the webcam started and the model loaded')
                },
                {
                    opcode: 'cameraIsOn',
                    blockType: BlockType.BOOLEAN,
                    text: msg('cameraIsOn', 'camera on?', 'Whether the webcam is running')
                },
                '---',
                // ── Hand ──
                {
                    opcode: 'whenGesture',
                    blockType: BlockType.HAT,
                    isEdgeActivated: false,
                    text: msg('whenGesture', 'when [HAND] shows [GESTURE]', 'Hat: a hand makes a gesture'),
                    arguments: {
                        HAND: {type: ArgumentType.STRING, menu: 'HAND', defaultValue: 'ANY'},
                        GESTURE: {type: ArgumentType.STRING, menu: 'GESTURE', defaultValue: 'FIST'}
                    }
                },
                {
                    opcode: 'handCount',
                    blockType: BlockType.REPORTER,
                    text: msg('handCount', 'number of hands', 'How many hands the camera sees')
                },
                {
                    opcode: 'handX',
                    blockType: BlockType.REPORTER,
                    text: msg('handX', 'x of [PART] of [HAND]', 'Stage x of a hand part'),
                    arguments: {
                        PART: {type: ArgumentType.STRING, menu: 'PART', defaultValue: 'indexTip'},
                        HAND: {type: ArgumentType.STRING, menu: 'HAND', defaultValue: 'ANY'}
                    }
                },
                {
                    opcode: 'handY',
                    blockType: BlockType.REPORTER,
                    text: msg('handY', 'y of [PART] of [HAND]', 'Stage y of a hand part'),
                    arguments: {
                        PART: {type: ArgumentType.STRING, menu: 'PART', defaultValue: 'indexTip'},
                        HAND: {type: ArgumentType.STRING, menu: 'HAND', defaultValue: 'ANY'}
                    }
                },
                {
                    opcode: 'handGesture',
                    blockType: BlockType.REPORTER,
                    text: msg('handGesture', 'gesture of [HAND]', 'The gesture a hand makes'),
                    arguments: {
                        HAND: {type: ArgumentType.STRING, menu: 'HAND', defaultValue: 'ANY'}
                    }
                },
                {
                    opcode: 'handIsGesture',
                    blockType: BlockType.BOOLEAN,
                    text: msg('handIsGesture', '[HAND] shows [GESTURE]?', 'Whether a hand makes a gesture'),
                    arguments: {
                        HAND: {type: ArgumentType.STRING, menu: 'HAND', defaultValue: 'ANY'},
                        GESTURE: {type: ArgumentType.STRING, menu: 'GESTURE', defaultValue: 'OPEN'}
                    }
                },
                '---',
                // ── Playground ──
                {
                    opcode: 'spawn',
                    blockType: BlockType.COMMAND,
                    text: msg('spawn', 'create [KIND] named [NAME] at x: [X] y: [Y] size [SIZE]',
                        'Put an object on the playground'),
                    arguments: {
                        KIND: {type: ArgumentType.STRING, menu: 'KIND', defaultValue: 'ball'},
                        NAME: {type: ArgumentType.STRING, defaultValue: 'ball'},
                        X: {type: ArgumentType.NUMBER, defaultValue: 0},
                        Y: {type: ArgumentType.NUMBER, defaultValue: 0},
                        SIZE: {type: ArgumentType.NUMBER, defaultValue: 60}
                    }
                },
                {
                    opcode: 'moveTo',
                    blockType: BlockType.COMMAND,
                    text: msg('moveTo', 'move [NAME] to x: [X] y: [Y]', 'Move a playground object'),
                    arguments: {
                        NAME: {type: ArgumentType.STRING, defaultValue: 'ball'},
                        X: {type: ArgumentType.NUMBER, defaultValue: 0},
                        Y: {type: ArgumentType.NUMBER, defaultValue: 0}
                    }
                },
                {
                    opcode: 'remove',
                    blockType: BlockType.COMMAND,
                    text: msg('remove', 'remove [NAME]', 'Remove a playground object'),
                    arguments: {
                        NAME: {type: ArgumentType.STRING, defaultValue: 'ball'}
                    }
                },
                {
                    opcode: 'removeAll',
                    blockType: BlockType.COMMAND,
                    text: msg('removeAll', 'remove all objects', 'Clear the playground')
                },
                {
                    opcode: 'objX',
                    blockType: BlockType.REPORTER,
                    text: msg('objX', 'x of [NAME]', 'Stage x of a playground object'),
                    arguments: {
                        NAME: {type: ArgumentType.STRING, defaultValue: 'ball'}
                    }
                },
                {
                    opcode: 'objY',
                    blockType: BlockType.REPORTER,
                    text: msg('objY', 'y of [NAME]', 'Stage y of a playground object'),
                    arguments: {
                        NAME: {type: ArgumentType.STRING, defaultValue: 'ball'}
                    }
                },
                {
                    opcode: 'touching',
                    blockType: BlockType.BOOLEAN,
                    text: msg('touching', '[NAME] touching [PART] of [HAND]?', 'Whether a hand part is on an object'),
                    arguments: {
                        NAME: {type: ArgumentType.STRING, defaultValue: 'ball'},
                        PART: {type: ArgumentType.STRING, menu: 'PART', defaultValue: 'indexTip'},
                        HAND: {type: ArgumentType.STRING, menu: 'HAND', defaultValue: 'ANY'}
                    }
                },
                {
                    opcode: 'say',
                    blockType: BlockType.COMMAND,
                    text: msg('say', 'say [TEXT]', 'Show a line of text on the playground'),
                    arguments: {
                        TEXT: {type: ArgumentType.STRING, defaultValue: 'Hello!'}
                    }
                },
                '---',
                // ── Score ──
                {
                    opcode: 'addScore',
                    blockType: BlockType.COMMAND,
                    text: msg('addScore', 'add [N] to score of player [PLAYER]', 'Change a player score'),
                    arguments: {
                        N: {type: ArgumentType.NUMBER, defaultValue: 1},
                        PLAYER: {type: ArgumentType.NUMBER, menu: 'PLAYER', defaultValue: '1'}
                    }
                },
                {
                    opcode: 'setScore',
                    blockType: BlockType.COMMAND,
                    text: msg('setScore', 'set score of player [PLAYER] to [N]', 'Set a player score'),
                    arguments: {
                        PLAYER: {type: ArgumentType.NUMBER, menu: 'PLAYER', defaultValue: '1'},
                        N: {type: ArgumentType.NUMBER, defaultValue: 0}
                    }
                },
                {
                    opcode: 'score',
                    blockType: BlockType.REPORTER,
                    text: msg('score', 'score of player [PLAYER]', 'A player score'),
                    arguments: {
                        PLAYER: {type: ArgumentType.NUMBER, menu: 'PLAYER', defaultValue: '1'}
                    }
                },
                {
                    opcode: 'startTimer',
                    blockType: BlockType.COMMAND,
                    text: msg('startTimer', 'start countdown [SECONDS] seconds', 'Start the countdown'),
                    arguments: {
                        SECONDS: {type: ArgumentType.NUMBER, defaultValue: 30}
                    }
                },
                {
                    opcode: 'timeLeft',
                    blockType: BlockType.REPORTER,
                    text: msg('timeLeft', 'seconds left', 'Seconds left on the countdown')
                },
                {
                    opcode: 'whenTimeUp',
                    blockType: BlockType.HAT,
                    isEdgeActivated: false,
                    text: msg('whenTimeUp', 'when time is up', 'Hat: the countdown reached zero')
                },
                {
                    opcode: 'showScoreboard',
                    blockType: BlockType.COMMAND,
                    text: msg('showScoreboard', '[SHOW] scoreboard', 'Show or hide the scoreboard'),
                    arguments: {
                        SHOW: {type: ArgumentType.STRING, menu: 'SHOW', defaultValue: 'show'}
                    }
                }
            ],
            menus: {
                MIRROR: {
                    acceptReporters: false,
                    items: [
                        item('mirror', 'mirror', 'mirrored'),
                        item('normal', 'normal', 'normal')
                    ]
                },
                // Hat fields match upper case, so these values are upper case; handlers lower-case them.
                HAND: {
                    acceptReporters: false,
                    items: [
                        item('ANY', 'handAny', 'any hand'),
                        item('1', 'hand1', 'hand 1'),
                        item('2', 'hand2', 'hand 2'),
                        item('LEFT', 'handLeft', 'left hand'),
                        item('RIGHT', 'handRight', 'right hand')
                    ]
                },
                GESTURE: {
                    acceptReporters: false,
                    items: [
                        item('FIST', 'fist', 'fist'),
                        item('OPEN', 'open', 'open hand'),
                        item('THUMB_UP', 'thumbUp', 'thumbs up'),
                        item('THUMB_DOWN', 'thumbDown', 'thumbs down'),
                        item('VICTORY', 'victory', 'victory'),
                        item('POINT_UP', 'pointUp', 'pointing up'),
                        item('I_LOVE_YOU', 'iLoveYou', 'I love you')
                    ]
                },
                PART: {
                    acceptReporters: false,
                    items: [
                        item('indexTip', 'indexTip', 'index finger'),
                        item('thumbTip', 'thumbTip', 'thumb'),
                        item('middleTip', 'middleTip', 'middle finger'),
                        item('wrist', 'wrist', 'wrist'),
                        item('palm', 'palm', 'palm')
                    ]
                },
                KIND: {
                    acceptReporters: false,
                    items: [
                        item('ball', 'ball', 'ball'),
                        item('cricket', 'cricket', 'cricket'),
                        item('drop', 'drop', 'raindrop'),
                        item('basket', 'basket', 'basket'),
                        item('star', 'star', 'star'),
                        item('bomb', 'bomb', 'bomb')
                    ]
                },
                PLAYER: {
                    acceptReporters: true,
                    items: [
                        {text: '1', value: '1'},
                        {text: '2', value: '2'}
                    ]
                },
                SHOW: {
                    acceptReporters: false,
                    items: [
                        item('show', 'show', 'show'),
                        item('hide', 'hide', 'hide')
                    ]
                }
            }
        };
    }

    // ─── Camera ───

    cameraOn ({MIRROR}: {MIRROR: ArgValue}) {
        this.runtime.events.emit(CameraAiEvent.CAMERA_COMMAND, {on: true, mirror: MIRROR !== 'normal'});
    }

    cameraOff () {
        this.runtime.events.emit(CameraAiEvent.CAMERA_COMMAND, {on: false});
    }

    // Event hat: started from the CAMERA_STATUS handler.
    whenCameraReady () {
        return true;
    }

    cameraIsOn () {
        return this.vision.cameraOn;
    }

    // ─── Hand ───

    // Event hat: started from _fireGestureHats.
    whenGesture () {
        return true;
    }

    handCount () {
        return this.vision.hands().length;
    }

    handX ({PART, HAND}: {PART: ArgValue, HAND: ArgValue}) {
        const p = this.vision.partPosition(toSelector(HAND), String(PART));
        return p ? p.x : 0;
    }

    handY ({PART, HAND}: {PART: ArgValue, HAND: ArgValue}) {
        const p = this.vision.partPosition(toSelector(HAND), String(PART));
        return p ? p.y : 0;
    }

    handGesture ({HAND}: {HAND: ArgValue}) {
        const h = this.vision.hand(toSelector(HAND));
        return h ? h.gesture : 'none';
    }

    handIsGesture ({HAND, GESTURE}: {HAND: ArgValue, GESTURE: ArgValue}) {
        const wanted = toGesture(GESTURE);
        return this.vision.handsMatching(toSelector(HAND)).some(h => h.gesture === wanted);
    }

    // ─── Playground ───

    spawn ({KIND, NAME, X, Y, SIZE}: {KIND: ArgValue, NAME: ArgValue, X: ArgValue, Y: ArgValue, SIZE: ArgValue}) {
        this.playground.spawn(String(NAME), String(KIND) as ObjectKind, Number(X) || 0, Number(Y) || 0,
            Number(SIZE) || 60);
    }

    moveTo ({NAME, X, Y}: {NAME: ArgValue, X: ArgValue, Y: ArgValue}) {
        this.playground.moveTo(String(NAME), Number(X) || 0, Number(Y) || 0);
    }

    remove ({NAME}: {NAME: ArgValue}) {
        this.playground.remove(String(NAME));
    }

    removeAll () {
        this.playground.removeAll();
    }

    objX ({NAME}: {NAME: ArgValue}) {
        const o = this.playground.object(String(NAME));
        return o ? o.x : 0;
    }

    objY ({NAME}: {NAME: ArgValue}) {
        const o = this.playground.object(String(NAME));
        return o ? o.y : 0;
    }

    touching ({NAME, PART, HAND}: {NAME: ArgValue, PART: ArgValue, HAND: ArgValue}) {
        const selector = toSelector(HAND);
        // Any hand touching counts, not only the first one seen.
        const selectors = selector === 'any' ? ['1', '2'] as const : [selector];
        return selectors.some(s => this.playground.touching(
            String(NAME), this.vision.partPosition(s, String(PART))));
    }

    say ({TEXT}: {TEXT: ArgValue}) {
        this.playground.say(String(TEXT));
    }

    // ─── Score ───

    addScore ({N, PLAYER}: {N: ArgValue, PLAYER: ArgValue}) {
        this.playground.addScore(Number(PLAYER) || 1, Number(N) || 0);
    }

    setScore ({PLAYER, N}: {PLAYER: ArgValue, N: ArgValue}) {
        this.playground.setScore(Number(PLAYER) || 1, Number(N) || 0);
    }

    score ({PLAYER}: {PLAYER: ArgValue}) {
        return this.playground.score(Number(PLAYER) || 1);
    }

    startTimer ({SECONDS}: {SECONDS: ArgValue}) {
        this.playground.startTimer(Number(SECONDS) || 0);
    }

    timeLeft () {
        return this.playground.timeLeft();
    }

    // Event hat: started by the playground when its countdown ends.
    whenTimeUp () {
        return true;
    }

    showScoreboard ({SHOW}: {SHOW: ArgValue}) {
        this.playground.showScoreboard(SHOW !== 'hide');
    }
}

export default CameraAiExtension;
