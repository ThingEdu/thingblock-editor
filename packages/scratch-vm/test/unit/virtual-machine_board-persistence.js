const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
const sb3 = require('../../src/serialization/sb3');

const test = tap.test;

const deviceBase = 'http://localhost:3030/resources/extensions/devices/thingbot';
const servoBase = 'http://localhost:3030/resources/extensions/peripheral/servo';
const buzzerBase = 'http://localhost:3030/resources/extensions/peripheral/buzzer';

// A device that auto-provides `servo`; `buzzer` is only reachable by the user adding it. This lets the
// tests assert that persistence stores the user-added peripheral and NOT the device-provided one.
const deviceManifest = {
    id: 'thingbot',
    kind: 'device',
    name: 'ThingBot',
    fqbn: 'esp32:esp32:esp32c3',
    icon: './icon.svg',
    description: {id: 'device.thingbot.description', default: 'A ThingEdu ESP32-C3 board.'},
    manufacturer: 'ThingEdu',
    requires: 'serial',
    extensions: ['servo']
};
const servoManifest = {
    id: 'servo',
    kind: 'peripheral',
    name: 'Servo',
    blocks: './blocks.js',
    generator: './generator.js',
    toolbox: './toolbox.js'
};
const servoToolbox = {kind: 'category', name: 'Servo', contents: [{kind: 'block', type: 'servo_setangle'}]};
const buzzerManifest = {
    id: 'buzzer',
    kind: 'peripheral',
    name: 'Buzzer',
    blocks: './blocks.js',
    generator: './generator.js',
    toolbox: './toolbox.js'
};
const buzzerToolbox = {kind: 'category', name: 'Buzzer', contents: [{kind: 'block', type: 'buzzer_tone'}]};

const makeModules = () => ({
    [`${servoBase}/toolbox.js`]: {default: servoToolbox},
    [`${servoBase}/blocks.js`]: {registerBlocks: Blockly => {
        Blockly.Blocks.servo_setangle = {};
    }},
    [`${servoBase}/generator.js`]: {registerGenerators: (generator, Order) => {
        generator.forBlock.servo_setangle = () => `servo.write(90);${Order.ATOMIC}`;
    }},
    [`${buzzerBase}/toolbox.js`]: {default: buzzerToolbox},
    [`${buzzerBase}/blocks.js`]: {registerBlocks: Blockly => {
        Blockly.Blocks.buzzer_tone = {};
    }},
    [`${buzzerBase}/generator.js`]: {registerGenerators: (generator, Order) => {
        generator.forBlock.buzzer_tone = () => `tone(8, 440);${Order.ATOMIC}`;
    }}
});

const registerPacks = vm => {
    vm.registerDeviceManifest(deviceManifest, deviceBase);
    vm.registerPeripheralManifest(servoManifest, servoBase);
    vm.registerPeripheralManifest(buzzerManifest, buzzerBase);
};

// `register` controls whether the device/peripheral packs are known to the VM up front, so a test can
// model a project loaded before its helper packs arrived.
const makeVM = ({register = true} = {}) => {
    const vm = new VirtualMachine();
    const modules = makeModules();
    vm._importPackModule = url => (
        url in modules ? Promise.resolve(modules[url]) : Promise.reject(new Error(`404 ${url}`))
    );
    vm.setScratchBlocks({Blocks: {}, arduinoGenerator: {forBlock: {}}, ArduinoOrder: {ATOMIC: 0, NONE: 99}});
    if (register) registerPacks(vm);
    return vm;
};

test('serialize persists the selected board and only the user-added peripherals', async t => {
    const vm = makeVM();
    await vm.selectDevice('thingbot');
    await vm.addPeripheral('buzzer');

    const obj = sb3.serialize(vm.runtime);
    t.same(obj.board, {device: 'thingbot', peripherals: ['buzzer']},
        'board carries the device and the user-added peripheral, not the device-provided servo');

    t.end();
});

test('serialize writes no board field in host mode', async t => {
    const vm = makeVM();
    const obj = sb3.serialize(vm.runtime);
    t.equal(obj.board, undefined, 'no board field when no device is selected');

    await vm.selectDevice('thingbot');
    await vm.selectDevice(null);
    t.equal(sb3.serialize(vm.runtime).board, undefined, 'deselecting clears the board field');

    t.end();
});

test('deserialize surfaces the saved board, or null when absent', async t => {
    const vm = makeVM();

    const withBoard = await sb3.deserialize(
        {targets: [], board: {device: 'thingbot', peripherals: ['buzzer']}}, vm.runtime, null
    );
    t.same(withBoard.board, {device: 'thingbot', peripherals: ['buzzer']}, 'board is returned from the json');

    const withoutBoard = await sb3.deserialize({targets: []}, vm.runtime, null);
    t.equal(withoutBoard.board, null, 'board is null when the json has none');

    t.end();
});

test('_applyBoard restores the device and user peripherals, emitting BOARD_RESTORED', async t => {
    const vm = makeVM();
    let restored = null;
    vm.on('BOARD_RESTORED', payload => {
        restored = payload;
    });

    await vm._applyBoard({device: 'thingbot', peripherals: ['buzzer']});

    t.equal(vm._selectedDeviceId, 'thingbot', 'the device is selected');
    t.same(vm.getProjectPeripheralIds(), ['buzzer'], 'the user peripheral is restored');
    t.same(vm.getActivePeripheralToolboxCategories(), [servoToolbox, buzzerToolbox],
        'both the device-provided and restored user peripheral are active');
    t.same(restored, {device: 'thingbot', peripherals: ['buzzer']}, 'BOARD_RESTORED carries the applied board');
    t.same(vm.runtime.board, {device: 'thingbot', peripherals: ['buzzer']}, 'runtime board mirrors the restored state');

    t.end();
});

test('_applyBoard defers when the device is not yet registered, then applies on retry', async t => {
    const vm = makeVM({register: false});
    let restored = false;
    vm.on('BOARD_RESTORED', () => {
        restored = true;
    });

    await vm._applyBoard({device: 'thingbot', peripherals: ['buzzer']});

    t.same(vm._pendingBoard, {device: 'thingbot', peripherals: ['buzzer']}, 'the board is held pending');
    t.equal(vm._selectedDeviceId, null, 'no device selected while pending');
    t.notOk(restored, 'BOARD_RESTORED not emitted while pending');

    // The helper packs arrive; the retry path re-applies the held board.
    registerPacks(vm);
    await vm._applyBoard(vm._pendingBoard);

    t.equal(vm._pendingBoard, null, 'pending board cleared once applied');
    t.same(vm.getProjectPeripheralIds(), ['buzzer'], 'the user peripheral is restored after retry');
    t.ok(restored, 'BOARD_RESTORED emitted after retry');

    t.end();
});

test('_applyBoard with no board resets to host mode and signals a null board', async t => {
    const vm = makeVM();
    let restored = false;
    vm.on('BOARD_RESTORED', payload => {
        restored = payload;
    });
    await vm.selectDevice('thingbot');
    await vm.addPeripheral('buzzer');

    await vm._applyBoard(null);

    t.equal(vm._selectedDeviceId, null, 'device cleared');
    t.same(vm.getProjectPeripheralIds(), [], 'user peripherals cleared');
    t.same(vm.getActivePeripheralToolboxCategories(), [], 'no active categories');
    t.equal(vm.runtime.board, null, 'runtime board cleared');
    t.same(restored, {device: null, peripherals: []},
        'BOARD_RESTORED signals a null board so the editor clears its selection');

    t.end();
});

test('deserializeProject registers the board\'s blocks before emitting the workspace update', async t => {
    // Build the VM here rather than via makeVM so the test holds the same Blockly
    // shim the VM registers pack blocks into.
    const blocks = {};
    const vm = new VirtualMachine();
    const modules = makeModules();
    vm._importPackModule = url => (
        url in modules ? Promise.resolve(modules[url]) : Promise.reject(new Error(`404 ${url}`))
    );
    vm.setScratchBlocks({Blocks: blocks, arduinoGenerator: {forBlock: {}}, ArduinoOrder: {ATOMIC: 0, NONE: 99}});
    registerPacks(vm);

    // What the GUI does on `workspaceUpdate`: hand the project XML to Blockly, which
    // throws on any block type it has no definition for. The board's pack blocks are
    // only defined once the board is applied, so record what was registered at the
    // moment the update fired.
    let definedAtUpdate = null;
    vm.on('workspaceUpdate', () => {
        definedAtUpdate = Object.keys(blocks);
    });

    await vm.deserializeProject({
        projectVersion: 3,
        targets: [{isStage: true,
            name: 'Stage',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            comments: {},
            currentCostume: 0,
            costumes: [],
            sounds: [],
            volume: 100}],
        board: {device: 'thingbot', peripherals: ['buzzer']}
    }, null);

    t.ok(definedAtUpdate, 'the workspace update fired');
    t.ok(definedAtUpdate.includes('servo_setangle'),
        'the device-provided pack block is defined before the workspace renders');
    t.ok(definedAtUpdate.includes('buzzer_tone'),
        'the restored user peripheral block is defined before the workspace renders');

    t.end();
});

test('applying a deferred board re-emits the workspace update', async t => {
    // A project whose device pack has not arrived yet holds its board pending, so the
    // workspace renders before any of the board's blocks are defined. When the packs
    // land and the held board is finally applied, the workspace has to be re-rendered
    // or the project's blocks stay dropped for the rest of the session.
    const blocks = {};
    const vm = new VirtualMachine();
    const modules = makeModules();
    vm._importPackModule = url => (
        url in modules ? Promise.resolve(modules[url]) : Promise.reject(new Error(`404 ${url}`))
    );
    vm.setScratchBlocks({
        Blocks: blocks,
        arduinoGenerator: {forBlock: {}},
        ArduinoOrder: {ATOMIC: 0, NONE: 99}
    });

    await vm.deserializeProject({
        projectVersion: 3,
        targets: [{
            isStage: true,
            name: 'Stage',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            comments: {},
            currentCostume: 0,
            costumes: [],
            sounds: [],
            volume: 100
        }],
        board: {device: 'thingbot', peripherals: ['buzzer']}
    }, null);
    t.ok(vm._pendingBoard, 'the board is held pending while the packs are unknown');

    let definedAtUpdate = null;
    vm.on('workspaceUpdate', () => {
        definedAtUpdate = Object.keys(blocks);
    });

    // The helper's packs arrive and the held board is applied.
    registerPacks(vm);
    await vm._applyBoard(vm._pendingBoard);

    t.ok(definedAtUpdate, 'a workspace update follows the deferred board being applied');
    t.ok(definedAtUpdate && definedAtUpdate.includes('servo_setangle'),
        'the board\'s blocks are defined by the time that update fires');

    t.end();
});
