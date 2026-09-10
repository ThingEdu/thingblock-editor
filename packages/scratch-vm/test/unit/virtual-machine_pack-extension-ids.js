const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine');

const test = tap.test;

// scratch-parser requires every target to carry a costume; the serializer writes this same inert
// placeholder, so a saved project always has one.
const placeholderCostume = {
    name: 'costume1',
    assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
    dataFormat: 'svg'
};

// A saved project whose blocks come from resource packs: `serial` is a reusable peripheral, `thingBotC3`
// a device-owned one. Neither is a VM extension, so both appear in `extensions` only because the sb3
// serializer derives that list from opcode prefixes.
const projectWithPackBlocks = () => JSON.stringify({
    targets: [
        {
            isStage: true,
            name: 'Stage',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            comments: {},
            costumes: [placeholderCostume],
            sounds: [],
            volume: 100
        },
        {
            isStage: false,
            name: 'Sprite1',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {
                hat: {
                    opcode: 'event_whenarduinobegin',
                    next: 'init',
                    parent: null,
                    inputs: {},
                    fields: {},
                    shadow: false,
                    topLevel: true,
                    x: 0,
                    y: 0
                },
                init: {
                    opcode: 'thingBotC3_init',
                    next: 'begin',
                    parent: 'hat',
                    inputs: {},
                    fields: {},
                    shadow: false,
                    topLevel: false
                },
                begin: {
                    opcode: 'serial_begin',
                    next: null,
                    parent: 'init',
                    inputs: {},
                    fields: {BAUD: ['9600', null]},
                    shadow: false,
                    topLevel: false
                }
            },
            comments: {},
            costumes: [placeholderCostume],
            sounds: [],
            volume: 100
        }
    ],
    monitors: [],
    extensions: ['thingBotC3', 'serial'],
    board: {device: 'thingbot', peripherals: ['serial']},
    meta: {semver: '3.0.0', vm: '14.1.0', agent: ''}
});

test('a project using resource-pack blocks loads when no packs have been registered', async t => {
    const vm = new VirtualMachine();

    await vm.loadProject(projectWithPackBlocks());

    const sprite = vm.runtime.targets.find(target => !target.isStage);
    t.ok(sprite.blocks.getBlock('init'), 'the device-owned pack block survived the load');
    t.ok(sprite.blocks.getBlock('begin'), 'the reusable pack block survived the load');
    t.end();
});

test('registering a peripheral manifest records its id as pack-owned', async t => {
    const vm = new VirtualMachine();
    const recorded = [];
    vm.extensionManager.addResourcePackId = id => recorded.push(id);

    vm.registerPeripheralManifest(
        {id: 'serial', kind: 'peripheral', name: 'Serial'},
        'http://localhost:3030/resources/extensions/peripheral/serial'
    );

    t.same(recorded, ['serial'], 'the pack id, which is also its opcode prefix, was recorded');
    t.end();
});

test('the saved board is applied before the workspace update that renders its blocks', async t => {
    const base = 'http://localhost:3030/resources/extensions/peripheral/thingBotC3';
    const vm = new VirtualMachine();
    vm._importPackModule = url => Promise.resolve({
        [`${base}/toolbox.js`]: {default: {kind: 'category', name: 'ThingBot', contents: []}},
        [`${base}/blocks.js`]: {registerBlocks: Blockly => {
            Blockly.Blocks.thingBotC3_init = {};
        }},
        [`${base}/generator.js`]: {registerGenerators: () => {}}
    }[url]);
    const scratchBlocks = {Blocks: {}, arduinoGenerator: {forBlock: {}}, ArduinoOrder: {ATOMIC: 0}};
    vm.setScratchBlocks(scratchBlocks);
    vm.registerDeviceManifest({
        id: 'thingbot',
        kind: 'device',
        name: 'ThingBot',
        fqbn: 'esp32:esp32:esp32c3',
        icon: './icon.svg',
        description: {id: 'device.thingbot.description', default: 'A ThingEdu board.'},
        extensions: ['thingBotC3']
    }, 'http://localhost:3030/resources/extensions/devices/thingbot');
    vm.registerPeripheralManifest({
        id: 'thingBotC3',
        kind: 'peripheral',
        name: 'ThingBot',
        hidden: true,
        blocks: './blocks.js',
        generator: './generator.js',
        toolbox: './toolbox.js'
    }, base);

    let registeredAtUpdate = false;
    vm.on('workspaceUpdate', () => {
        registeredAtUpdate = Boolean(scratchBlocks.Blocks.thingBotC3_init);
    });

    await vm.loadProject(projectWithPackBlocks());

    t.ok(registeredAtUpdate, 'the pack block was on the shared Blockly by the time the workspace updated');
    t.end();
});
