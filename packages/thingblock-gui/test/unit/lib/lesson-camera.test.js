import {
    CAMERA_CHECK_WINDOW_MS,
    cameraSnapshot,
    decideCameraCheck,
    gradeCameraStep,
    isCameraStep
} from '../../../src/lib/lesson-camera';

const ok = {ok: true, message: ''};
const no = {ok: false, message: 'Camera chưa bật.'};
const PLAYGROUND = {objects: [{name: 'sao', x: 0, y: 0, size: 50}], scores: [1, 0], say: 'Nắm tay'};
const hand = (x, y, gesture = 'fist') => ({gesture, landmarks: Array.from({length: 21}, () => ({x, y}))});

test('a step is a Camera AI step when its rules are playground rules', () => {
    expect(isCameraStep({rules: [{kind: 'cameraOn'}, {kind: 'say', text: 'x'}]})).toBe(true);
    expect(isCameraStep({rules: [{kind: 'light', target: 'L1', on: true}]})).toBe(false);
    expect(isCameraStep({rules: []})).toBe(false);
});

test('passes as soon as every rule holds, run or not', () => {
    expect(decideCameraCheck({results: [ok], ranAt: null, stepAt: 0, now: 0}).status).toBe('passed');
});

test('is idle before Run, checking for a while after Run, then says what is missing', () => {
    expect(decideCameraCheck({results: [no], ranAt: null, stepAt: 0, now: 99999}).status).toBe('idle');
    expect(decideCameraCheck({results: [no], ranAt: 1000, stepAt: 0, now: 1000 + CAMERA_CHECK_WINDOW_MS - 1}))
        .toEqual({status: 'waiting', messages: []});
    expect(decideCameraCheck({results: [ok, no], ranAt: 1000, stepAt: 0, now: 1000 + CAMERA_CHECK_WINDOW_MS}))
        .toEqual({status: 'failed', messages: ['Camera chưa bật.']});
});

test('a step opened after Run gets its own window', () => {
    const verdict = decideCameraCheck({results: [no], ranAt: 0, stepAt: 10000, now: 10000 + 10});
    expect(verdict.status).toBe('waiting');
});

test('sees hands only while the camera is on and the frame is fresh, placed like the blocks place them', () => {
    const vision = {hands: [hand(0.5, 0.5)], mirror: true, t: 1000};
    expect(cameraSnapshot({cameraOn: true, vision, playground: PLAYGROUND}, 1500).hands[0].parts.indexTip)
        .toEqual({x: 0, y: 0});
    expect(cameraSnapshot({cameraOn: true, vision, playground: PLAYGROUND}, 2500).hands).toEqual([]);
    expect(cameraSnapshot({cameraOn: false, vision, playground: PLAYGROUND}, 1500).hands).toEqual([]);
});

test('grades a step on the playground', () => {
    const step = {rules: [
        {kind: 'cameraOn'},
        {kind: 'gesture', gesture: 'fist'},
        {kind: 'touch', name: 'sao', part: 'indexTip'},
        {kind: 'say', text: 'Nắm tay'}
    ]};
    const seen = {cameraOn: true, vision: {hands: [hand(0.5, 0.5)], mirror: true, t: 0}, playground: PLAYGROUND};
    expect(gradeCameraStep(step, seen, 0).every(r => r.ok)).toBe(true);
    expect(gradeCameraStep(step, {...seen, cameraOn: false}, 0).filter(r => !r.ok)).toHaveLength(3);
});
