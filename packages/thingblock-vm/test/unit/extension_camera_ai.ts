import {test} from 'tap';
import {EventEmitter} from 'events';
import CameraAiExtension from '../../src/extensions/scratch3_camera_ai/index.ts';
import {VisionState} from '../../src/extensions/scratch3_camera_ai/vision-state.ts';
import type {Hand, Landmark} from '../../src/extensions/scratch3_camera_ai/vision-state.ts';
import {Playground} from '../../src/extensions/scratch3_camera_ai/playground.ts';
import type {PlaygroundState} from '../../src/extensions/scratch3_camera_ai/playground.ts';
import {CameraAiEvent, RuntimeEvent} from '../../src/event/event-name.ts';

// A hand whose every landmark sits at one normalized point.
const handAt = (x: number, y: number, extra: Partial<Hand> = {}): Hand => ({
    gesture: 'none',
    score: 1,
    side: 'right',
    landmarks: Array.from({length: 21}, (): Landmark => ({x, y})),
    ...extra
});

type HatCall = [string, Record<string, string>];

const makeExtension = () => {
    const hats: HatCall[] = [];
    const runtime = {
        events: new EventEmitter(),
        startHats: (opcode: string, fields: Record<string, string> = {}) => {
            hats.push([opcode, fields]);
            return [];
        }
    };
    const ext = new CameraAiExtension(runtime);
    const results = (hands: Hand[], mirror = true) =>
        runtime.events.emit(CameraAiEvent.VISION_RESULTS, {hands, mirror, t: Date.now()});
    return {ext, runtime, results, hats};
};

test('a hand part maps to the Scratch stage, mirrored like the picture', t => {
    const vision = new VisionState(() => 1000);
    vision.update({hands: [handAt(0.25, 0.25)], mirror: true, t: 1000});
    // The index tip at a quarter from the left of the camera frame appears on the viewer's right.
    t.same(vision.partPosition('any', 'indexTip'), {x: 120, y: 90});

    vision.update({hands: [handAt(0.25, 0.25)], mirror: false, t: 1000});
    t.same(vision.partPosition('any', 'indexTip'), {x: -120, y: 90});
    t.end();
});

test('stale results count as no hands, so a frozen tracker never holds a gesture', t => {
    let now = 1000;
    const vision = new VisionState(() => now);
    vision.update({hands: [handAt(0.5, 0.5, {gesture: 'fist'})], mirror: true, t: 1000});
    t.equal(vision.hands().length, 1);
    now = 2500;
    t.equal(vision.hands().length, 0);
    t.equal(vision.partPosition('any', 'indexTip'), null);
    t.end();
});

test('hand selectors pick by order or by side', t => {
    const vision = new VisionState(() => 0);
    const left = handAt(0.2, 0.5, {side: 'left', gesture: 'open'});
    const right = handAt(0.8, 0.5, {side: 'right', gesture: 'fist'});
    vision.update({hands: [right, left], mirror: true, t: 0});
    t.equal(vision.hand('1'), right);
    t.equal(vision.hand('2'), left);
    t.equal(vision.hand('left'), left);
    t.equal(vision.hand('right'), right);
    t.same(vision.handsMatching('any'), [right, left]);
    t.same(vision.handsMatching('left'), [left]);
    t.end();
});

test('a gesture starts its hats once when it appears, for every selector that sees it', t => {
    const {ext, results, hats} = makeExtension();
    results([handAt(0.5, 0.5, {gesture: 'fist', side: 'right'})]);
    t.same(hats, [
        ['cameraAi_whenGesture', {HAND: 'any', GESTURE: 'fist'}],
        ['cameraAi_whenGesture', {HAND: '1', GESTURE: 'fist'}],
        ['cameraAi_whenGesture', {HAND: 'right', GESTURE: 'fist'}]
    ]);

    // The same gesture held over the next frames starts nothing more.
    results([handAt(0.5, 0.5, {gesture: 'fist', side: 'right'})]);
    t.equal(hats.length, 3);

    // Released, then made again: it fires again.
    results([handAt(0.5, 0.5, {gesture: 'none', side: 'right'})]);
    results([handAt(0.5, 0.5, {gesture: 'fist', side: 'right'})]);
    t.equal(hats.length, 6);

    // The menu stores upper-case values; the predicates read them case-insensitively.
    t.ok(ext.handIsGesture({HAND: 'ANY', GESTURE: 'FIST'}));
    t.ok(ext.handIsGesture({HAND: 'RIGHT', GESTURE: 'FIST'}));
    t.notOk(ext.handIsGesture({HAND: 'LEFT', GESTURE: 'FIST'}));
    t.notOk(ext.handIsGesture({HAND: 'ANY', GESTURE: 'OPEN'}));
    t.equal(ext.handGesture({HAND: 'ANY'}), 'fist');
    t.equal(ext.handCount(), 1);
    t.end();
});

test('camera blocks ask the GUI and reflect its status; ready starts its hat once', t => {
    const {ext, runtime, hats} = makeExtension();
    const commands: object[] = [];
    runtime.events.on(CameraAiEvent.CAMERA_COMMAND, (c: object) => commands.push(c));

    ext.cameraOn({MIRROR: 'mirror'});
    ext.cameraOn({MIRROR: 'normal'});
    ext.cameraOff();
    t.same(commands, [{on: true, mirror: true}, {on: true, mirror: false}, {on: false}]);

    t.notOk(ext.cameraIsOn());
    runtime.events.emit(CameraAiEvent.CAMERA_STATUS, {on: true, ready: false});
    t.ok(ext.cameraIsOn());
    t.same(hats, []);
    runtime.events.emit(CameraAiEvent.CAMERA_STATUS, {on: true, ready: true});
    runtime.events.emit(CameraAiEvent.CAMERA_STATUS, {on: true, ready: true});
    t.same(hats, [['cameraAi_whenCameraReady', {}]]);
    runtime.events.emit(CameraAiEvent.CAMERA_STATUS, {on: false, ready: false});
    t.notOk(ext.cameraIsOn());
    runtime.events.emit(CameraAiEvent.CAMERA_STATUS, {on: true, ready: true});
    t.equal(hats.length, 2, 'ready again after off fires again');
    t.end();
});

test('playground objects move, report and touch a hand part', t => {
    const {ext, runtime, results} = makeExtension();
    const updates: PlaygroundState[] = [];
    runtime.events.on(CameraAiEvent.PLAYGROUND_UPDATE, (s: PlaygroundState) => updates.push(s));

    ext.spawn({KIND: 'ball', NAME: 'bong', X: 100, Y: 50, SIZE: 60});
    t.equal(ext.objX({NAME: 'bong'}), 100);
    t.equal(ext.objY({NAME: 'bong'}), 50);
    ext.moveTo({NAME: 'bong', X: 900, Y: -900});
    t.equal(ext.objX({NAME: 'bong'}), 240, 'clamped to the stage');
    t.equal(ext.objY({NAME: 'bong'}), -180);
    t.equal(updates.length, 2);
    t.same(updates[1].objects, [{name: 'bong', kind: 'ball', x: 240, y: -180, size: 60}]);

    // Index tip at the bottom-right corner of the mirrored picture, i.e. camera-left.
    results([handAt(0.0, 1.0)]);
    t.ok(ext.touching({NAME: 'bong', PART: 'indexTip', HAND: 'ANY'}));
    results([handAt(0.5, 0.5)]);
    t.notOk(ext.touching({NAME: 'bong', PART: 'indexTip', HAND: 'ANY'}));
    t.notOk(ext.touching({NAME: 'missing', PART: 'indexTip', HAND: 'ANY'}));

    ext.remove({NAME: 'bong'});
    t.equal(ext.objX({NAME: 'bong'}), 0);
    t.end();
});

test('scores', t => {
    const updates: PlaygroundState[] = [];
    const pg = new Playground(s => updates.push(s), () => {}, () => 0);

    pg.addScore(1, 2);
    pg.addScore(2, 1);
    pg.addScore(1, -1);
    t.equal(pg.score(1), 1);
    t.equal(pg.score(2), 1);
    pg.setScore(2, 10);
    t.equal(pg.score(2), 10);
    t.ok(updates[updates.length - 1].showScoreboard, 'scoring shows the board');
    t.end();
});

test('the countdown counts seconds and fires time-up once', async t => {
    let now = 0;
    let fired = 0;
    const pg = new Playground(() => {}, () => {
        fired += 1;
    }, () => now);

    pg.startTimer(0.05);
    t.equal(pg.timeLeft(), 1);
    t.notOk(pg.timeUp());
    now = 50;
    t.equal(pg.timeLeft(), 0);
    t.ok(pg.timeUp());
    await new Promise(resolve => setTimeout(resolve, 80));
    t.equal(fired, 1);

    // A countdown stopped early never fires.
    pg.startTimer(0.05);
    pg.stop();
    await new Promise(resolve => setTimeout(resolve, 80));
    t.equal(fired, 1);
    t.end();
});

test('stop clears the countdown and the message but keeps the objects', t => {
    const {ext, runtime} = makeExtension();
    ext.spawn({KIND: 'star', NAME: 'sao', X: 0, Y: 0, SIZE: 40});
    ext.say({TEXT: 'xin chào'});
    ext.startTimer({SECONDS: 30});
    runtime.events.emit(RuntimeEvent.PROJECT_STOP_ALL);

    const state = ext.playground.state();
    t.equal(state.say, '');
    t.equal(state.timeLeft, null);
    t.equal(state.objects.length, 1);

    runtime.events.emit(CameraAiEvent.PLAYGROUND_COMMAND, {type: 'reset'});
    t.equal(ext.playground.state().objects.length, 0, 'the panel can clear everything');
    t.end();
});

test('getInfo lists every opcode with an implementation and event hats only', t => {
    const {ext} = makeExtension();
    const info = ext.getInfo();
    t.equal(info.id, 'cameraAi');
    for (const block of info.blocks || []) {
        if (block === '---') continue;
        t.type((ext as unknown as Record<string, unknown>)[block.opcode as string], 'function', block.opcode);
        if (block.blockType === 'hat') t.equal(block.isEdgeActivated, false, `${block.opcode} is an event hat`);
    }
    t.end();
});
