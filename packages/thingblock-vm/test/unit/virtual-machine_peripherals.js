const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
const LinkClient = require('../../src/link/client/link-client');

const test = tap.test;

const deviceBase = 'http://localhost:3030/resources/extensions/devices/thingbot';
const coreBase = 'http://localhost:3030/resources/extensions/peripheral/thingbot-core';
const servoBase = 'http://localhost:3030/resources/extensions/peripheral/servo';

// A device that references two peripherals by id: its own hidden pack (the device-exclusive surface)
// first, then a reusable component. There is no separate device-extension type — both are peripherals.
const deviceManifest = {
    id: 'thingbot',
    kind: 'device',
    name: 'ThingBot',
    fqbn: 'esp32:esp32:esp32c3',
    icon: './icon.svg',
    description: {id: 'device.thingbot.description', default: 'A ThingEdu ESP32-C3 board.'},
    manufacturer: 'ThingEdu',
    requires: 'serial',
    extensions: ['thingbot-core', 'servo']
};

const coreManifest = {
    id: 'thingbot-core',
    kind: 'peripheral',
    name: 'ThingBot',
    hidden: true,
    blocks: './blocks.js',
    generator: './generator.js',
    toolbox: './toolbox.js',
    libs: [{path: 'libs/ThingBot'}]
};
const coreToolbox = {kind: 'category', name: 'ThingBot', contents: [{kind: 'block', type: 'thingbot_digitalwrite'}]};

const servoManifest = {
    id: 'servo',
    kind: 'peripheral',
    name: 'Servo',
    blocks: './blocks.js',
    generator: './generator.js',
    toolbox: './toolbox.js',
    libs: [{path: 'libs/Servo'}]
};
const servoToolbox = {kind: 'category', name: 'Servo', contents: [{kind: 'block', type: 'servo_setangle'}]};

// A reusable peripheral the device does NOT reference — only reachable by the user adding it.
const buzzerBase = 'http://localhost:3030/resources/extensions/peripheral/buzzer';
const buzzerManifest = {
    id: 'buzzer',
    kind: 'peripheral',
    name: 'Buzzer',
    blocks: './blocks.js',
    generator: './generator.js',
    toolbox: './toolbox.js',
    libs: [{path: 'libs/Buzzer'}]
};
const buzzerToolbox = {kind: 'category', name: 'Buzzer', contents: [{kind: 'block', type: 'buzzer_tone'}]};

// A peripheral that carries library-card metadata (icon + localized description), to check the list
// surfaces it. It is never activated, so it needs no served modules.
const lcdBase = 'http://localhost:3030/resources/extensions/peripheral/lcd';
const lcdManifest = {
    id: 'lcd',
    kind: 'peripheral',
    name: 'LCD',
    icon: './icon.svg',
    description: {id: 'peripheral.lcd.description', default: 'A 16x2 character display.'}
};

// A VM whose pack imports are served from in-memory modules; `counts` records imports per URL so a
// re-selection can be shown to skip re-importing the registered modules. ThingBot references both the
// hidden core pack and the servo peripheral, so one device selection reaches both.
const makeVM = () => {
    const vm = new VirtualMachine();
    const counts = {};
    const modules = {
        [`${coreBase}/toolbox.js`]: {default: coreToolbox},
        [`${coreBase}/blocks.js`]: {registerBlocks: Blockly => {
            Blockly.Blocks.thingbot_digitalwrite = {};
        }},
        [`${coreBase}/generator.js`]: {registerGenerators: (generator, Order) => {
            generator.forBlock.thingbot_digitalwrite = () => `digitalWrite(2, HIGH);${Order.ATOMIC}`;
        }},
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
    };
    vm._importPackModule = url => {
        counts[url] = (counts[url] || 0) + 1;
        if (!(url in modules)) return Promise.reject(new Error(`404 ${url}`));
        return Promise.resolve(modules[url]);
    };
    vm.registerDeviceManifest(deviceManifest, deviceBase);
    vm.registerPeripheralManifest(coreManifest, coreBase);
    vm.registerPeripheralManifest(servoManifest, servoBase);
    vm.registerPeripheralManifest(buzzerManifest, buzzerBase);
    vm.registerPeripheralManifest(lcdManifest, lcdBase);
    return {vm, counts};
};

const makeScratchBlocks = () => ({
    Blocks: {},
    arduinoGenerator: {forBlock: {}},
    ArduinoOrder: {ATOMIC: 0, NONE: 99}
});

test('selectDevice registers each referenced peripheral\'s blocks and codegen on the injected singleton', async t => {
    const {vm} = makeVM();
    const scratchBlocks = makeScratchBlocks();
    vm.setScratchBlocks(scratchBlocks);

    await vm.selectDevice('thingbot');

    t.ok(scratchBlocks.Blocks.thingbot_digitalwrite, 'hidden core block registered on the shared Blockly');
    t.ok(scratchBlocks.Blocks.servo_setangle, 'reusable peripheral block registered on the shared Blockly');
    t.type(
        scratchBlocks.arduinoGenerator.forBlock.thingbot_digitalwrite,
        'function',
        'core codegen registered on the shared arduinoGenerator'
    );
    t.type(
        scratchBlocks.arduinoGenerator.forBlock.servo_setangle,
        'function',
        'peripheral codegen registered on the shared arduinoGenerator'
    );

    t.same(
        vm.getActivePeripheralToolboxCategories(),
        [coreToolbox, servoToolbox],
        'toolbox categories follow the device extensions order (own pack first)'
    );
    t.same(
        vm.getActivePeripheralLibs(),
        [
            {pack: 'extensions/peripheral/thingbot-core', lib: 'libs/ThingBot'},
            {pack: 'extensions/peripheral/servo', lib: 'libs/Servo'}
        ],
        'libs aggregate across active peripherals in order, as helper-resolvable {pack, lib} refs'
    );

    t.end();
});

test('getActivePeripheral* reflect the active device and clear on deselect', async t => {
    const {vm} = makeVM();
    vm.setScratchBlocks(makeScratchBlocks());

    t.same(vm.getActivePeripheralToolboxCategories(), [], 'no categories before a device is selected');
    t.same(vm.getActivePeripheralLibs(), [], 'no libs before a device is selected');

    await vm.selectDevice('thingbot');
    t.same(vm.getActivePeripheralToolboxCategories(), [coreToolbox, servoToolbox], 'surfaces active categories');

    await vm.selectDevice(null);
    t.same(vm.getActivePeripheralToolboxCategories(), [], 'categories cleared after deselect');
    t.same(vm.getActivePeripheralLibs(), [], 'libs cleared after deselect');

    t.end();
});

test('records peripherals headless: toolbox/libs recorded, blocks skipped', async t => {
    const {vm, counts} = makeVM();
    // No setScratchBlocks: headless.

    await vm.selectDevice('thingbot');

    t.same(vm.getActivePeripheralToolboxCategories(), [coreToolbox, servoToolbox], 'toolbox recorded without a handle');
    t.same(
        vm.getActivePeripheralLibs(),
        [
            {pack: 'extensions/peripheral/thingbot-core', lib: 'libs/ThingBot'},
            {pack: 'extensions/peripheral/servo', lib: 'libs/Servo'}
        ],
        'libs recorded without a handle'
    );
    t.notOk(counts[`${coreBase}/blocks.js`], 'did not import core blocks without a handle');
    t.notOk(counts[`${servoBase}/blocks.js`], 'did not import peripheral blocks without a handle');

    t.end();
});

test('re-selecting a device re-activates without re-importing its modules', async t => {
    const {vm, counts} = makeVM();
    vm.setScratchBlocks(makeScratchBlocks());

    await vm.selectDevice('thingbot');
    await vm.selectDevice(null);
    await t.resolves(vm.selectDevice('thingbot'), 're-selection does not throw');

    t.same(vm.getActivePeripheralToolboxCategories(), [coreToolbox, servoToolbox], 're-activated');
    t.equal(counts[`${coreBase}/blocks.js`], 1, 'core blocks imported once');
    t.equal(counts[`${servoBase}/blocks.js`], 1, 'peripheral blocks imported once');

    t.end();
});

test('selecting null or a built-in board clears the active peripherals', async t => {
    const {vm} = makeVM();
    vm.setScratchBlocks(makeScratchBlocks());

    await vm.selectDevice('thingbot');
    await vm.selectDevice(null);
    t.same(vm.getActivePeripheralToolboxCategories(), [], 'null selection clears active peripherals');

    await vm.selectDevice('thingbot');
    await vm.selectDevice('esp32c3');
    t.same(vm.getActivePeripheralToolboxCategories(), [], 'a built-in board (no pack) clears active peripherals');

    t.end();
});

test('a device referencing an unknown peripheral skips it without throwing', async t => {
    const {vm} = makeVM();
    vm.setScratchBlocks(makeScratchBlocks());
    vm.registerDeviceManifest(
        {
            id: 'ghost',
            kind: 'device',
            name: 'Ghost',
            fqbn: 'x:y:z',
            icon: './icon.svg',
            description: {id: 'd', default: 'd'},
            manufacturer: 'x',
            requires: 'serial',
            extensions: ['does-not-exist', 'servo']
        },
        deviceBase
    );

    await t.resolves(vm.selectDevice('ghost'), 'unknown peripheral does not break selection');
    t.same(vm.getActivePeripheralToolboxCategories(), [servoToolbox], 'the known peripheral still activates');

    t.end();
});

test('getPeripheralList lists non-hidden packs with active/locked flags', async t => {
    const {vm} = makeVM();
    vm.setScratchBlocks(makeScratchBlocks());

    await vm.selectDevice('thingbot');
    const list = vm.getPeripheralList();
    const byId = Object.fromEntries(list.map(p => [p.id, p]));

    t.notOk(byId['thingbot-core'], 'the hidden device-owned pack is excluded from the library');
    t.same(byId.servo, {id: 'servo', name: 'Servo', active: true, locked: true},
        'a device-provided peripheral is active and locked');
    t.same(byId.buzzer, {id: 'buzzer', name: 'Buzzer', active: false, locked: false},
        'an unreferenced peripheral is neither active nor locked');

    t.end();
});

test('getPeripheralList surfaces icon and description when the manifest provides them', async t => {
    const {vm} = makeVM();
    const lcd = vm.getPeripheralList().find(p => p.id === 'lcd');

    t.equal(lcd.iconURL, `${lcdBase}/icon.svg`, 'the icon resolves against the pack base');
    t.equal(lcd.description, 'A 16x2 character display.', 'the localized description resolves to its default');

    const buzzer = vm.getPeripheralList().find(p => p.id === 'buzzer');
    t.notOk('iconURL' in buzzer, 'a pack without an icon has no iconURL');
    t.notOk('description' in buzzer, 'a pack without a description has no description');

    t.end();
});

test('addPeripheral activates a user-chosen peripheral and emits PERIPHERALS_CHANGED', async t => {
    const {vm} = makeVM();
    const scratchBlocks = makeScratchBlocks();
    vm.setScratchBlocks(scratchBlocks);
    let changed = 0;
    vm.on('PERIPHERALS_CHANGED', () => changed++);

    await vm.selectDevice('thingbot');
    await vm.addPeripheral('buzzer');

    t.ok(scratchBlocks.Blocks.buzzer_tone, 'the added peripheral\'s blocks register on the shared Blockly');
    t.same(
        vm.getActivePeripheralToolboxCategories(),
        [coreToolbox, servoToolbox, buzzerToolbox],
        'the added category appends after the device-provided ones'
    );
    t.same(vm.getProjectPeripheralIds(), ['buzzer'], 'the user-added id is recorded for the project');
    t.equal(changed, 1, 'PERIPHERALS_CHANGED fired once');

    t.end();
});

test('removePeripheral deactivates a user-added peripheral and emits', async t => {
    const {vm} = makeVM();
    vm.setScratchBlocks(makeScratchBlocks());
    let changed = 0;
    vm.on('PERIPHERALS_CHANGED', () => changed++);

    await vm.selectDevice('thingbot');
    await vm.addPeripheral('buzzer');
    vm.removePeripheral('buzzer');

    t.same(vm.getActivePeripheralToolboxCategories(), [coreToolbox, servoToolbox], 'the category is gone');
    t.same(vm.getProjectPeripheralIds(), [], 'the user-added id is cleared');
    t.equal(changed, 2, 'PERIPHERALS_CHANGED fired for the add and the remove');

    t.end();
});

test('a device-provided peripheral cannot be added or removed by the user', async t => {
    const {vm} = makeVM();
    vm.setScratchBlocks(makeScratchBlocks());

    await vm.selectDevice('thingbot');
    await vm.addPeripheral('servo');
    t.same(vm.getProjectPeripheralIds(), [], 'adding a device-provided peripheral is a no-op');

    vm.removePeripheral('servo');
    t.same(
        vm.getActivePeripheralToolboxCategories(),
        [coreToolbox, servoToolbox],
        'servo stays active after a remove attempt'
    );

    t.end();
});

test('user-added peripherals re-activate across device re-selection without re-importing', async t => {
    const {vm, counts} = makeVM();
    vm.setScratchBlocks(makeScratchBlocks());

    await vm.selectDevice('thingbot');
    await vm.addPeripheral('buzzer');
    await vm.selectDevice(null);
    await vm.selectDevice('thingbot');

    t.same(
        vm.getActivePeripheralToolboxCategories(),
        [coreToolbox, servoToolbox, buzzerToolbox],
        'the user-added peripheral comes back on re-selection'
    );
    t.equal(counts[`${buzzerBase}/blocks.js`], 1, 'buzzer blocks imported once across re-selection');

    t.end();
});

// `__THINGBLOCK_RESOURCE_BASE__` (the Tauri desktop shell's host override, read once in
// link-controller.js) points resourceOrigin at a base that does not end in `/resources` at all —
// unlike the helper's own `ws://.../resources` route every other fixture in this file models. Pack
// libs must still resolve to a helper-relative {pack, lib} ref under that override.
const hostedDeviceBase = '/thingblock-resource/extensions/devices/thingbot';
const hostedCoreBase = '/thingblock-resource/extensions/peripheral/thingbot-core';

// A minimal peripheral manifest with no blocks/generator, so the fixture below needs no served
// modules for them (only its toolbox, which it does declare).
const hostedCoreManifest = {
    id: 'thingbot-core',
    kind: 'peripheral',
    name: 'ThingBot',
    hidden: true,
    toolbox: './toolbox.js',
    libs: [{path: 'libs/ThingBot'}]
};

test('getActivePeripheralLibs resolves pack paths under a __THINGBLOCK_RESOURCE_BASE__-style override', async t => {
    const vm = new VirtualMachine();
    vm.client = new LinkClient(vm.runtime, {resourceBase: '/thingblock-resource'});
    vm._importPackModule = url => {
        if (url === `${hostedCoreBase}/toolbox.js`) return Promise.resolve({default: coreToolbox});
        return Promise.reject(new Error(`404 ${url}`));
    };
    vm.registerDeviceManifest(
        Object.assign({}, deviceManifest, {extensions: ['thingbot-core']}),
        hostedDeviceBase
    );
    vm.registerPeripheralManifest(hostedCoreManifest, hostedCoreBase);

    await vm.selectDevice('thingbot');

    t.same(
        vm.getActivePeripheralLibs(),
        [{pack: 'extensions/peripheral/thingbot-core', lib: 'libs/ThingBot'}],
        'the pack path resolves against the override base, not a literal "/resources/" split'
    );

    t.end();
});
