const test = require('tap').test;

const makeTestStorage = require('../fixtures/make-test-storage');
const Runtime = require('../../src/engine/runtime').default;
const Target = require('../../src/engine/target').default;
const sb3 = require('../../src/serialization/sb3');

test('sb3-roundtrip', t => {
    const runtime1 = new Runtime();
    runtime1.attachStorage(makeTestStorage());

    const runtime2 = new Runtime();
    runtime2.attachStorage(makeTestStorage());

    const testRuntimeState = (label, targets) => {
        t.equal(targets.length, 2, `${label}: target count`);
        const [stage, device] = targets;

        t.equal(stage.isStage, true);
        t.equal(stage.getName(), 'Stage');
        t.equal(stage.variables.score.name, 'score');

        t.equal(device.isStage, false);
        t.equal(device.getName(), 'Device');
        t.equal(device.blocks.getBlock('flag').opcode, 'event_whenflagclicked');
        t.equal(device.comments.note.text, 'a note');
    };

    const stage = new Target(runtime1);
    stage.name = 'Stage';
    stage.isStage = true;
    stage.createVariable('score', 'score', '');

    const device = new Target(runtime1);
    device.name = 'Device';
    device.blocks.createBlock({
        id: 'flag',
        opcode: 'event_whenflagclicked',
        inputs: {},
        fields: {},
        next: null,
        parent: null,
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    });
    device.createComment('note', null, 'a note', 10, 20, 200, 100, false);

    runtime1.targets = [stage, device];
    runtime1.board = {device: 'arduino-uno', peripherals: []};
    testRuntimeState('original', runtime1.targets);

    // Doing a JSON `stringify` and `parse` here more accurately simulate a save/load cycle. In particular:
    // 1. it ensures that any non-serializable data is thrown away, and
    // 2. `sb3.deserialize` and its helpers do some `hasOwnProperty` checks which fail on the object returned by
    //    `sb3.serialize` but succeed if that object is "flattened" in this way.
    const serializedState = JSON.parse(JSON.stringify(sb3.serialize(runtime1)));
    t.strictSame(serializedState.targets.map(target => target.sounds), [[], []], 'targets save no sounds');

    return sb3.deserialize(serializedState, runtime2).then(({targets, board}) => {
        testRuntimeState('copy', targets);
        t.strictSame(board, {device: 'arduino-uno', peripherals: []});
    });
});
