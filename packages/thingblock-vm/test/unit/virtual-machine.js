const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
const Target = require('../../src/engine/target').default;
const Variable = require('../../src/engine/variable').default;
const adapter = require('../../src/engine/adapter').default;
const events = require('../fixtures/events.json');
const log = require('../../src/util/log');
const path = require('path');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;

const test = tap.test;

test('Project loaded emits runtime event', t => {
    const vm = new VirtualMachine();
    const projectUri = path.resolve(__dirname, '../fixtures/default.sb3');
    const project = readFileToBuffer(projectUri);
    let projectLoaded = false;

    vm.runtime.events.addListener('PROJECT_LOADED', () => {
        projectLoaded = true;
    });

    vm.loadProject(project).then(() => {
        t.equal(projectLoaded, true, 'Project load event emitted');
        t.end();
    });
});

test('emitWorkspaceUpdate', t => {
    const vm = new VirtualMachine();
    const blocksToXML = comments => {
        let blockString = 'blocks\n';
        if (comments) {
            for (const commentId in comments) {
                const comment = comments[commentId];
                blockString += `A Block Comment: ${comment.toXML()}`;
            }

        }
        return blockString;
    };
    vm.runtime.targets = [
        {
            isStage: true,
            variables: {
                global: {
                    toXML: () => 'global'
                }
            },
            blocks: {
                toXML: blocksToXML
            },
            comments: {
                aStageComment: {
                    toXML: () => 'aStageComment',
                    blockId: null
                }
            }
        }, {
            variables: {
                unused: {
                    toXML: () => 'unused'
                }
            },
            blocks: {
                toXML: blocksToXML
            },
            comments: {
                someBlockComment: {
                    toXML: () => 'someBlockComment',
                    blockId: 'someBlockId'
                }
            }
        }, {
            variables: {
                local: {
                    toXML: () => 'local'
                }
            },
            blocks: {
                toXML: blocksToXML
            },
            comments: {
                someOtherComment: {
                    toXML: () => 'someOtherComment',
                    blockId: null
                },
                aBlockComment: {
                    toXML: () => 'aBlockComment',
                    blockId: 'a block'
                }
            }
        }
    ];
    vm.editingTarget = vm.runtime.targets[2];

    let xml = null;
    vm.emit = (event, data) => (xml = data.xml);
    vm.emitWorkspaceUpdate();
    t.not(xml.indexOf('global'), -1);
    t.not(xml.indexOf('local'), -1);
    t.equal(xml.indexOf('unused'), -1);
    t.not(xml.indexOf('blocks'), -1);
    t.equal(xml.indexOf('aStageComment'), -1);
    t.equal(xml.indexOf('someBlockComment'), -1);
    t.not(xml.indexOf('someOtherComment'), -1);
    t.not(xml.indexOf('A Block Comment: aBlockComment'), -1);
    t.end();
});

test('setVariableValue', t => {
    const vm = new VirtualMachine();
    const target = new Target(vm.runtime);
    target.createVariable('a-variable', 'a-name', Variable.SCALAR_TYPE);

    vm.runtime.targets = [target];

    // Returns false if there is no variable to set
    t.equal(vm.setVariableValue(target.id, 'not-a-variable', 100), false);

    // Returns false if there is no target with that id
    t.equal(vm.setVariableValue('not-a-target', 'a-variable', 100), false);

    // Returns true and updates the value if variable is present
    t.equal(vm.setVariableValue(target.id, 'a-variable', 100), true);
    t.equal(target.lookupVariableById('a-variable').value, 100);

    t.end();
});

test('getVariableValue', t => {
    const vm = new VirtualMachine();
    const target = new Target(vm.runtime);
    target.createVariable('a-variable', 'a-name', Variable.SCALAR_TYPE);

    vm.runtime.targets = [target];

    // Returns null if there is no variable with that id
    t.equal(vm.getVariableValue(target.id, 'not-a-variable'), null);

    // Returns null if there is no target with that id
    t.equal(vm.getVariableValue('not-a-target', 'a-variable'), null);

    // Returns true and updates the value if variable is present
    t.equal(vm.getVariableValue(target.id, 'a-variable'), 0);
    vm.setVariableValue(target.id, 'a-variable', 'string');
    t.equal(vm.getVariableValue(target.id, 'a-variable'), 'string');

    t.end();
});

test('shareBlocksToTarget without a source target creates a missing variable on the stage', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);

    runtime.targets = [stage, target];
    vm.editingTarget = target;
    vm.runtime.setEditingTarget(target);

    const blocksToShare = adapter(events.mockVariableBlock);

    t.equal(Object.keys(stage.variables).length, 0);
    t.equal(Object.keys(target.variables).length, 0);

    vm.shareBlocksToTarget(blocksToShare, target.id).then(() => {
        t.equal(Object.keys(stage.variables).length, 1, 'variable created on stage');
        const newVar = stage.variables['mock var id'];
        t.ok(newVar, 'variable preserves the original id');
        t.equal(newVar.name, 'a mock variable');
        t.equal(newVar.type, Variable.SCALAR_TYPE);
        t.equal(Object.keys(target.variables).length, 0, 'no variable on the receiving sprite');

        const newBlockId = Object.keys(target.blocks._blocks)[0];
        t.equal(target.blocks.getBlock(newBlockId).fields.VARIABLE.id, 'mock var id');

        t.end();
    });
});

test('shareBlocksToTarget without a source target creates a missing broadcast on the stage', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);

    runtime.targets = [stage, target];
    vm.editingTarget = target;
    vm.runtime.setEditingTarget(target);

    const blocksToShare = adapter(events.mockBroadcastBlock);

    t.equal(Object.keys(stage.variables).length, 0);

    vm.shareBlocksToTarget(blocksToShare, target.id).then(() => {
        t.equal(Object.keys(stage.variables).length, 1, 'broadcast created on stage');
        const newBroadcast = stage.variables['mock broadcast message id'];
        t.ok(newBroadcast, 'broadcast preserves the original id');
        t.equal(newBroadcast.name, 'my message');
        t.equal(newBroadcast.type, Variable.BROADCAST_MESSAGE_TYPE);

        const menuBlockId = Object.keys(target.blocks._blocks)
            .find(id => target.blocks.getBlock(id).opcode === 'event_broadcast_menu');
        t.ok(menuBlockId, 'broadcast menu block exists on the target');
        t.equal(target.blocks.getBlock(menuBlockId).fields.BROADCAST_OPTION.id, 'mock broadcast message id');

        t.end();
    });
});

test('shareBlocksToTarget without a source target remaps a variable to an existing same-name global', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);

    runtime.targets = [stage, target];
    vm.editingTarget = target;
    vm.runtime.setEditingTarget(target);

    stage.createVariable('pre-existing global var id', 'a mock variable', Variable.SCALAR_TYPE);

    const blocksToShare = adapter(events.mockVariableBlock);

    vm.shareBlocksToTarget(blocksToShare, target.id).then(() => {
        t.equal(Object.keys(stage.variables).length, 1, 'no duplicate variable created');
        t.ok(stage.variables['pre-existing global var id'], 'existing variable preserved');

        const newBlockId = Object.keys(target.blocks._blocks)[0];
        t.equal(target.blocks.getBlock(newBlockId).fields.VARIABLE.id, 'pre-existing global var id',
            'block field id remapped to existing variable');

        t.end();
    });
});

test('shareBlocksToTarget without a source target creates broadcasts when pasted onto the stage', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = new Target(runtime);
    stage.isStage = true;

    runtime.targets = [stage];
    vm.editingTarget = stage;
    vm.runtime.setEditingTarget(stage);

    const blocksToShare = adapter(events.mockBroadcastBlock);

    vm.shareBlocksToTarget(blocksToShare, stage.id).then(() => {
        t.equal(Object.keys(stage.variables).length, 1, 'broadcast created on stage when stage is the target');
        const newBroadcast = stage.variables['mock broadcast message id'];
        t.ok(newBroadcast);
        t.equal(newBroadcast.name, 'my message');
        t.equal(newBroadcast.type, Variable.BROADCAST_MESSAGE_TYPE);

        t.end();
    });
});

test('shareBlocksToTarget loads extensions that have not yet been loaded', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = new Target(runtime);
    runtime.targets = [stage];

    const fakeBlocks = [
        {opcode: 'loaded_fakeblock'},
        {opcode: 'notloaded_fakeblock'}
    ];

    // Stub the extension manager
    const loadedIds = [];
    vm.extensionManager = {
        isExtensionLoaded: id => id === 'loaded',
        loadExtensionURL: id => new Promise(resolve => {
            loadedIds.push(id);
            resolve();
        })
    };

    vm.shareBlocksToTarget(fakeBlocks, stage.id).then(() => {
        // Verify that only the not-loaded extension gets loaded
        t.same(loadedIds, ['notloaded']);
        t.end();
    });
});

test('installTargets repairs dangling variable references on whole-project load', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;

    const stage = new Target(runtime);
    stage.isStage = true;
    stage.name = 'Stage';

    const sprite = new Target(runtime);
    sprite.isStage = false;
    sprite.name = 'Sprite';
    // Block with a variable field referencing an id that's not defined anywhere — the
    // shape produced when a project saved during the missing-definitions bug is loaded.
    sprite.blocks.createBlock(adapter(events.mockVariableBlock)[0]);
    adapter(events.mockBroadcastBlock).forEach(block => sprite.blocks.createBlock(block));

    t.equal(Object.keys(stage.variables).length, 0);
    t.equal(Object.keys(sprite.variables).length, 0);

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, sprite], extensions, true).then(() => {
        t.equal(Object.keys(stage.variables).length, 2, 'variable and broadcast created on stage');
        t.ok(stage.variables['mock var id'], 'dangling variable reference reconciled');
        t.ok(stage.variables['mock broadcast message id'], 'dangling broadcast reference reconciled');
        t.equal(Object.keys(sprite.variables).length, 0, 'no spurious sprite-local variables');

        t.end();
    });
});

test('installTargets does NOT rename clean local-vs-global name collisions on whole-project load', t => {
    // Regression guard: a project saved with a sprite-local variable that name-collides with
    // a stage global must load unchanged. The fixUpVariableReferences rename behavior is
    // for sprite import; project load uses the repair-only helper.
    const vm = new VirtualMachine();
    const runtime = vm.runtime;

    const stage = new Target(runtime);
    stage.isStage = true;
    stage.name = 'Stage';
    stage.createVariable('global score id', 'score', Variable.SCALAR_TYPE);

    const sprite = new Target(runtime);
    sprite.isStage = false;
    sprite.name = 'Sprite';
    sprite.createVariable('local score id', 'score', Variable.SCALAR_TYPE);
    // Block referencing the sprite-local variable with the same name as the global.
    sprite.blocks.createBlock({
        id: 'a block',
        opcode: 'data_variable',
        inputs: {},
        fields: {
            VARIABLE: {
                name: 'VARIABLE',
                id: 'local score id',
                value: 'score',
                variableType: Variable.SCALAR_TYPE
            }
        },
        next: null,
        topLevel: true,
        parent: null,
        shadow: false,
        x: 0,
        y: 0
    });

    const extensions = {extensionIDs: new Set(), extensionURLs: new Map()};
    vm.installTargets([stage, sprite], extensions, true).then(() => {
        t.equal(sprite.variables['local score id'].name, 'score',
            'sprite local variable name unchanged after whole-project load');
        t.equal(sprite.blocks.getBlock('a block').fields.VARIABLE.id, 'local score id',
            'block field id unchanged');
        t.equal(Object.keys(stage.variables).length, 1, 'no new stage variables created');

        t.end();
    });
});

test('installTargets loads a project whose blocks come from resource packs instead of VM extensions', t => {
    // Regression guard: device/peripheral packs (e.g. thingBotC3, dht, serial, oled) register their
    // blocks into Blockly and the Arduino generator when a board is selected -- they are never VM
    // extensions. An opcode prefix derived from those blocks must not be treated as a missing VM
    // extension to fetch, or the whole project load rejects and the project can never reopen.
    const vm = new VirtualMachine();
    const runtime = vm.runtime;

    const stage = new Target(runtime);
    stage.isStage = true;
    stage.name = 'Stage';

    const originalWarn = log.warn;
    const warnings = [];
    log.warn = (...args) => warnings.push(args.join(' '));

    const extensions = {
        extensionIDs: new Set(['thingBotC3', 'dht']),
        extensionURLs: new Map()
    };

    return vm.installTargets([stage], extensions, true)
        .then(() => {
            log.warn = originalWarn;
            t.match(warnings.join('\n'), /thingBotC3/, 'skip of thingBotC3 is logged');
            t.match(warnings.join('\n'), /dht/, 'skip of dht is logged');
            t.notOk(vm.extensionManager.isExtensionLoaded('thingBotC3'),
                'resource-pack id is not registered as a VM extension');
            t.end();
        })
        .catch(err => {
            log.warn = originalWarn;
            t.fail(`installTargets should not reject for resource-pack extension ids: ${err}`);
            t.end();
        });
});

test('installTargets still loads a builtin extension id', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;

    const stage = new Target(runtime);
    stage.isStage = true;
    stage.name = 'Stage';

    const extensions = {
        extensionIDs: new Set(['coreExample']),
        extensionURLs: new Map()
    };

    return vm.installTargets([stage], extensions, true).then(() => {
        t.ok(vm.extensionManager.isExtensionLoaded('coreExample'), 'builtin extension was loaded');
        t.end();
    });
});

test('installTargets still loads an extension id that has a real URL recorded in extensionURLs', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;

    const stage = new Target(runtime);
    stage.isStage = true;
    stage.name = 'Stage';

    const loadedURLs = [];
    vm.extensionManager = {
        isExtensionLoaded: () => false,
        isBuiltinExtension: () => false,
        loadExtensionURL: url => {
            loadedURLs.push(url);
            return Promise.resolve();
        },
        refreshBlocks: () => Promise.resolve()
    };

    const originalWarn = log.warn;
    const warnings = [];
    log.warn = (...args) => warnings.push(args.join(' '));

    const extensions = {
        extensionIDs: new Set(['remoteThing']),
        extensionURLs: new Map([['remoteThing', 'https://example.com/remoteThing.js']])
    };

    return vm.installTargets([stage], extensions, true).then(() => {
        log.warn = originalWarn;
        t.same(loadedURLs, ['https://example.com/remoteThing.js'],
            'the recorded URL, not the bare id, is passed to the loader');
        t.notMatch(warnings.join('\n'), /remoteThing/, 'a genuine remote extension is not skipped or warned about');
        t.end();
    });
});

test('Setting turbo mode emits events', t => {
    let turboMode = null;

    const vm = new VirtualMachine();

    vm.addListener('TURBO_MODE_ON', () => {
        turboMode = true;
    });
    vm.addListener('TURBO_MODE_OFF', () => {
        turboMode = false;
    });

    vm.setTurboMode(true);
    t.equal(turboMode, true);

    vm.setTurboMode(false);
    t.equal(turboMode, false);

    t.end();
});

test('Starting the VM emits an event', t => {
    let started = false;
    const vm = new VirtualMachine();
    vm.addListener('RUNTIME_STARTED', () => {
        started = true;
    });
    vm.start();
    t.equal(started, true);
    vm.quit();
    t.end();
});

test('vm.greenFlag() emits a PROJECT_START event', t => {
    let greenFlagged = false;
    const vm = new VirtualMachine();
    vm.addListener('PROJECT_START', () => {
        greenFlagged = true;
    });
    vm.greenFlag();
    t.equal(greenFlagged, true);
    t.end();
});

test('toJSON encodes Infinity/NaN as 0, not null', t => {
    const vm = new VirtualMachine();
    const runtime = vm.runtime;
    const stage = new Target(runtime);
    stage.isStage = true;
    stage.createVariable('id1', 'name1', '');
    stage.variables.id1.value = Infinity;
    stage.createVariable('id2', 'name2', '');
    stage.variables.id2.value = -Infinity;
    stage.createVariable('id3', 'name3', '');
    stage.variables.id3.value = NaN;

    runtime.targets = [stage];

    const json = JSON.parse(vm.toJSON());
    t.equal(json.targets[0].variables.id1[1], 0);
    t.equal(json.targets[0].variables.id2[1], 0);
    t.equal(json.targets[0].variables.id3[1], 0);

    t.end();
});

test('clearFlyoutBlocks removes all of the flyout blocks', t => {
    const vm = new VirtualMachine();
    const flyoutBlocks = vm.runtime.flyoutBlocks;

    flyoutBlocks.createBlock(adapter(events.mockVariableBlock)[0]);
    t.equal(Object.keys(flyoutBlocks._blocks).length, 1);

    vm.clearFlyoutBlocks();
    t.equal(Object.keys(flyoutBlocks._blocks).length, 0);

    t.end();
});
