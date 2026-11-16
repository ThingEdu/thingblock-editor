const tap = require('tap');
const path = require('path');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const makeTestStorage = require('../fixtures/make-test-storage');
const VirtualMachine = require('../../src/virtual-machine').default;

let vm;
let projectChanged;
let blockContainer;

tap.beforeEach(() => {
    const projectUri = path.resolve(__dirname, '../fixtures/default.sb3');
    const project = readFileToBuffer(projectUri);

    vm = new VirtualMachine();

    vm.runtime.events.addListener('PROJECT_CHANGED', () => {
        projectChanged = true;
    });

    vm.attachStorage(makeTestStorage());
    return vm.project.load(project).then(() => {
        blockContainer = vm.workspace.editingTarget.blocks;

        // Add mock blocks to use for tests
        blockContainer.createBlock({
            id: 'a parent block',
            opcode: 'my_testParentBlock',
            fields: {},
            inputs: {}
        });


        blockContainer.createBlock({
            id: 'a new block',
            opcode: 'my_testBlock',
            topLevel: true,
            x: -10,
            y: 35,
            fields: {
                A_FIELD: {
                    name: 'A_FIELD',
                    value: 10
                }
            },
            inputs: {},
            parent: 'a block'
        });

        // Reset project changes from new blocks
        projectChanged = false;

    });
});

const test = tap.test;

test('Deleting a block should emit a project changed event', t => {
    blockContainer.deleteBlock('a new block');

    t.equal(projectChanged, true);
    t.end();
});

test('Changing a block should emit a project changed event', t => {
    vm.workspace.blockListener({
        type: 'change',
        element: 'field',
        blockId: 'a new block',
        name: 'A_FIELD',
        newValue: 300
    });

    t.equal(projectChanged, true);
    projectChanged = false;

    vm.workspace.blockListener({
        type: 'change',
        element: 'mutation',
        blockId: 'a new block',
        newValue: '<mutation></mutation>'
    });

    t.equal(projectChanged, true);

    t.end();
});

test('Moving a block to a new position should emit a project changed event', t => {
    blockContainer.moveBlock({
        id: 'a new block',
        newCoordinate: {
            x: -40,
            y: 350
        }
    });

    t.equal(projectChanged, true);
    t.end();
});

test('Connecting a block to a new parent should emit a project changed event', t => {
    blockContainer.createBlock({
        id: 'another block',
        opcode: 'my_testBlock'
    });

    projectChanged = false;

    blockContainer.moveBlock({
        id: 'a new block',
        newParent: 'another block'
    });

    t.equal(projectChanged, true);
    t.end();
});

test('Disconnecting a block from another should emit a project changed event', t => {
    blockContainer.moveBlock({
        id: 'a new block',
        oldParent: 'a parent block'
    });

    t.equal(projectChanged, true);
    t.end();
});

test('Renaming a variable should emit a project changed event', t => {
    vm.workspace.blockListener({
        type: 'var_create',
        varId: 'a new variable',
        varName: 'foo',
        varType: '',
        isLocal: false,
        isCloud: false
    });

    projectChanged = false;

    vm.workspace.blockListener({
        type: 'var_rename',
        varId: 'a new variable',
        oldName: 'foo',
        newName: 'bar'
    });

    t.equal(projectChanged, true);
    t.end();
});

test('Deleting a variable should emit a project changed event', t => {
    vm.workspace.blockListener({
        type: 'var_create',
        varId: 'a new variable',
        varName: 'foo',
        varType: '',
        isLocal: false,
        isCloud: false
    });

    projectChanged = false;

    vm.workspace.blockListener({
        type: 'var_delete',
        varId: 'a new variable',
        varName: 'foo',
        varType: '',
        isLocal: false,
        isCloud: false
    });

    t.equal(projectChanged, true);
    t.end();
});
