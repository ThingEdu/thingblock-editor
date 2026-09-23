import '../fixtures/prefer-ts';
import {test} from 'tap';
import Target from '../../src/engine/target.ts';
import Variable, {type VariableType} from '../../src/engine/variable.ts';
import adapter from '../../src/engine/adapter.ts';
import Runtime from '../../src/engine/runtime.ts';
import log from '../../src/util/log';
import events from '../fixtures/events.json';
import MonitorRecord from '../../src/engine/monitor-record.ts';
import {block} from '../fixtures/target.ts';
import type {Block} from '../../src/engine/block-types.ts';

test('spec', t => {
    const target = new Target(new Runtime());

    t.type(Target, 'function');
    t.type(target, 'object');
    t.ok(target instanceof Target);

    t.type(target.id, 'string');
    t.type(target.blocks, 'object');
    t.type(target.variables, 'object');
    t.type(target.comments, 'object');
    t.type(target._customState, 'object');

    t.type(target.createVariable, 'function');
    t.type(target.renameVariable, 'function');

    t.end();
});

// Create Variable tests.
test('createVariable', t => {
    const target = new Target(new Runtime());
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE);

    const variables = target.variables;
    t.equal(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    t.equal(variable.id, 'foo');
    t.equal(variable.name, 'bar');
    t.equal(variable.type, Variable.SCALAR_TYPE);
    t.equal(variable.value, 0);

    t.end();
});

// Create Same Variable twice.
test('createVariable2', t => {
    const target = new Target(new Runtime());
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE);
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE);

    const variables = target.variables;
    t.equal(Object.keys(variables).length, 1);

    t.end();
});

// Create a list
test('createListVariable creates a list', t => {
    const target = new Target(new Runtime());
    target.createVariable('foo', 'bar', Variable.LIST_TYPE);

    const variables = target.variables;
    t.equal(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    t.equal(variable.id, 'foo');
    t.equal(variable.name, 'bar');
    t.equal(variable.type, Variable.LIST_TYPE);
    t.strictSame(variable.value, []);

    t.end();
});

test('createVariable throws when given invalid type', t => {
    const target = new Target(new Runtime());
    t.throws(
        (() => target.createVariable('foo', 'bar', 'baz' as VariableType)),
        new Error('Invalid variable type: baz')
    );

    t.end();
});

// Rename Variable tests.
test('renameVariable', t => {
    const target = new Target(new Runtime());
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE);
    target.renameVariable('foo', 'bar2');

    const variables = target.variables;
    t.equal(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    t.equal(variable.id, 'foo');
    t.equal(variable.name, 'bar2');
    t.equal(variable.value, 0);

    t.end();
});

// Rename Variable that doesn't exist.
test('renameVariable2', t => {
    const target = new Target(new Runtime());
    target.renameVariable('foo', 'bar2');

    const variables = target.variables;
    t.equal(Object.keys(variables).length, 0);

    t.end();
});

// Rename Variable that with id that exists as another variable's name.
// Expect no change.
test('renameVariable3', t => {
    const target = new Target(new Runtime());
    target.createVariable('foo1', 'foo', Variable.SCALAR_TYPE);
    target.renameVariable('foo', 'bar2');

    const variables = target.variables;
    t.equal(Object.keys(variables).length, 1);
    const variable = variables[Object.keys(variables)[0]];
    t.equal(variable.id, 'foo1');
    t.equal(variable.name, 'foo');

    t.end();
});

test('deleteVariable', t => {
    const target = new Target(new Runtime());
    target.createVariable('foo', 'bar', Variable.SCALAR_TYPE);
    target.deleteVariable('foo');

    const variables = target.variables;
    t.equal(Object.keys(variables).length, 0);

    t.end();
});

// Delete Variable that doesn't exist.
test('deleteVariable2', t => {
    const target = new Target(new Runtime());
    target.deleteVariable('foo');

    const variables = target.variables;
    t.equal(Object.keys(variables).length, 0);

    t.end();
});

test('lookupOrCreateList creates a list if var with given id or var with given name does not exist', t => {
    const target = new Target(new Runtime());
    const variables = target.variables;

    t.equal(Object.keys(variables).length, 0);
    const listVar = target.lookupOrCreateList('foo', 'bar');
    t.equal(Object.keys(variables).length, 1);
    t.equal(listVar.id, 'foo');
    t.equal(listVar.name, 'bar');

    t.end();
});

test('lookupOrCreateList returns list if one with given id exists', t => {
    const target = new Target(new Runtime());
    const variables = target.variables;

    t.equal(Object.keys(variables).length, 0);
    target.createVariable('foo', 'bar', Variable.LIST_TYPE);
    t.equal(Object.keys(variables).length, 1);

    const listVar = target.lookupOrCreateList('foo', 'bar');
    t.equal(Object.keys(variables).length, 1);
    t.equal(listVar.id, 'foo');
    t.equal(listVar.name, 'bar');

    t.end();
});

test('lookupOrCreateList succeeds in finding list if id is incorrect but name matches', t => {
    const target = new Target(new Runtime());
    const variables = target.variables;

    t.equal(Object.keys(variables).length, 0);
    target.createVariable('foo', 'bar', Variable.LIST_TYPE);
    t.equal(Object.keys(variables).length, 1);

    const listVar = target.lookupOrCreateList('not foo', 'bar');
    t.equal(Object.keys(variables).length, 1);
    t.equal(listVar.id, 'foo');
    t.equal(listVar.name, 'bar');

    t.end();
});

test('lookupBroadcastMsg returns the var with given id if exists', t => {
    const target = new Target(new Runtime());
    const variables = target.variables;

    t.equal(Object.keys(variables).length, 0);
    target.createVariable('foo', 'bar', Variable.BROADCAST_MESSAGE_TYPE);
    t.equal(Object.keys(variables).length, 1);

    const broadcastMsg = target.lookupBroadcastMsg('foo', 'bar');
    t.equal(Object.keys(variables).length, 1);
    t.equal(broadcastMsg.id, 'foo');
    t.equal(broadcastMsg.name, 'bar');

    t.end();
});

test('createComment adds a comment to the target', t => {
    const target = new Target(new Runtime());
    const comments = target.comments;

    t.equal(Object.keys(comments).length, 0);
    target.createComment('a comment', null, 'some comment text',
        10, 20, 200, 300, true);
    t.equal(Object.keys(comments).length, 1);

    const comment = comments['a comment'];
    t.not(comment, null);
    t.equal(comment.blockId, null);
    t.equal(comment.text, 'some comment text');
    t.equal(comment.x, 10);
    t.equal(comment.y, 20);
    t.equal(comment.width, 200);
    t.equal(comment.height, 300);
    t.equal(comment.minimized, true);

    t.end();
});

test('creating comment with id that already exists does not change existing comment', t => {
    const target = new Target(new Runtime());
    const comments = target.comments;

    t.equal(Object.keys(comments).length, 0);
    target.createComment('a comment', null, 'some comment text',
        10, 20, 200, 300, true);
    t.equal(Object.keys(comments).length, 1);

    target.createComment('a comment', null,
        'some new comment text', 40, 50, 300, 400, false);

    const comment = comments['a comment'];
    t.not(comment, null);
    // All of the comment properties should remain unchanged from the first
    // time createComment was called
    t.equal(comment.blockId, null);
    t.equal(comment.text, 'some comment text');
    t.equal(comment.x, 10);
    t.equal(comment.y, 20);
    t.equal(comment.width, 200);
    t.equal(comment.height, 300);
    t.equal(comment.minimized, true);

    t.end();
});

test('creating a comment with a blockId also updates the comment property on the block', t => {
    const target = new Target(new Runtime());
    const comments = target.comments;
    target.blocks.createBlock({
        id: 'a mock block', opcode: 'test', fields: {}, inputs: {}, next: null, parent: null,
        shadow: false, topLevel: true
    });

    t.equal(Object.keys(comments).length, 0);
    target.createComment('a comment', 'a mock block', 'some comment text',
        10, 20, 200, 300, true);
    t.equal(Object.keys(comments).length, 1);

    const comment = comments['a comment'];
    t.equal(comment.blockId, 'a mock block');
    t.equal(target.blocks.getBlock('a mock block').comment, 'a comment');

    t.end();
});

test('fixUpVariableReferences fixes sprite global var conflicting with project global var', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;

    runtime.targets = [stage, target];

    // Create a global variable
    stage.createVariable('pre-existing global var id', 'a mock variable', Variable.SCALAR_TYPE);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    t.equal(Object.keys(target.variables).length, 0);
    t.equal(Object.keys(stage.variables).length, 1);
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

    target.fixUpVariableReferences();

    t.equal(Object.keys(target.variables).length, 0);
    t.equal(Object.keys(stage.variables).length, 1);
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'pre-existing global var id');

    t.end();
});

test('fixUpVariableReferences fixes sprite local var conflicting with project global var', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    // Create a global variable
    stage.createVariable('pre-existing global var id', 'a mock variable', Variable.SCALAR_TYPE);
    target.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    t.equal(Object.keys(target.variables).length, 1);
    t.equal(Object.keys(stage.variables).length, 1);
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    t.equal(target.variables['mock var id'].name, 'a mock variable');

    target.fixUpVariableReferences();

    t.equal(Object.keys(target.variables).length, 1);
    t.equal(Object.keys(stage.variables).length, 1);
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    t.equal(target.variables['mock var id'].name, 'Target: a mock variable');

    t.end();
});

test('fixUpVariableReferences fixes conflicting sprite local var without blocks referencing var', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    // Create a global variable
    stage.createVariable('pre-existing global var id', 'a mock variable', Variable.SCALAR_TYPE);
    target.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);


    t.equal(Object.keys(target.variables).length, 1);
    t.equal(Object.keys(stage.variables).length, 1);
    t.equal(target.variables['mock var id'].name, 'a mock variable');

    target.fixUpVariableReferences();

    t.equal(Object.keys(target.variables).length, 1);
    t.equal(Object.keys(stage.variables).length, 1);
    t.equal(target.variables['mock var id'].name, 'Target: a mock variable');

    t.end();
});

test('fixUpVariableReferences fixes sprite global var conflicting with other sprite\'s local var', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;

    const existingTarget = new Target(runtime);
    existingTarget.isStage = false;

    runtime.targets = [stage, target, existingTarget];

    // Create a local variable on the pre-existing target
    existingTarget.createVariable('pre-existing local var id', 'a mock variable', Variable.SCALAR_TYPE);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    t.equal(Object.keys(existingTarget.variables).length, 1);
    const existingVariable = Object.values(existingTarget.variables)[0];
    t.equal(existingVariable.name, 'a mock variable');
    t.equal(Object.keys(target.variables).length, 0);
    t.equal(Object.keys(stage.variables).length, 0);
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

    target.fixUpVariableReferences();

    t.equal(Object.keys(existingTarget.variables).length, 1);
    t.equal(existingVariable.name, 'a mock variable');
    t.equal(Object.keys(target.variables).length, 0);
    t.equal(Object.keys(stage.variables).length, 1);
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    const newGlobal = stage.variables[Object.keys(stage.variables)[0]];
    t.equal(newGlobal.name, 'a mock variable2');

    t.end();
});

test('fixUpVariableReferences does not change variable name if there is no variable conflict', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    // Create a global variable
    stage.createVariable('pre-existing global var id', 'a variable', Variable.SCALAR_TYPE);
    stage.createVariable('pre-existing global list id', 'a mock variable', Variable.LIST_TYPE);
    target.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    t.equal(Object.keys(target.variables).length, 1);
    t.equal(Object.keys(stage.variables).length, 2);
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    t.equal(target.variables['mock var id'].name, 'a mock variable');

    target.fixUpVariableReferences();

    t.equal(Object.keys(target.variables).length, 1);
    t.equal(Object.keys(stage.variables).length, 2);
    t.type(target.blocks.getBlock('a block'), 'object');
    t.type(target.blocks.getBlock('a block').fields, 'object');
    t.type(target.blocks.getBlock('a block').fields.VARIABLE, 'object');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');
    t.equal(target.variables['mock var id'].name, 'a mock variable');

    t.end();
});

const addBroadcastBlocksTo = (target: Target) => {
    adapter(events.mockBroadcastBlock).forEach(block => target.blocks.createBlock(block));
};

test('fixUpVariableReferences creates a stage broadcast for an undefined broadcast reference', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    addBroadcastBlocksTo(target);

    t.equal(Object.keys(stage.variables).length, 0);
    t.equal(target.blocks.getBlock('boadcast shadow').fields.BROADCAST_OPTION.id, 'mock broadcast message id');
    t.equal(target.blocks.getBlock('boadcast shadow').fields.BROADCAST_OPTION.value, 'my message');

    target.fixUpVariableReferences();

    t.equal(Object.keys(stage.variables).length, 1);
    const broadcast = stage.variables['mock broadcast message id'];
    t.ok(broadcast, 'broadcast created on stage with original id');
    t.equal(broadcast.name, 'my message');
    t.equal(broadcast.type, Variable.BROADCAST_MESSAGE_TYPE);
    t.equal(target.blocks.getBlock('boadcast shadow').fields.BROADCAST_OPTION.id, 'mock broadcast message id');

    t.end();
});

test('fixUpVariableReferences remaps a broadcast reference to an existing same-name stage broadcast', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    stage.createVariable('pre-existing broadcast id', 'my message', Variable.BROADCAST_MESSAGE_TYPE);
    addBroadcastBlocksTo(target);

    t.equal(Object.keys(stage.variables).length, 1);
    t.equal(target.blocks.getBlock('boadcast shadow').fields.BROADCAST_OPTION.id, 'mock broadcast message id');

    target.fixUpVariableReferences();

    t.equal(Object.keys(stage.variables).length, 1, 'no duplicate broadcast created');
    t.ok(stage.variables['pre-existing broadcast id'], 'existing broadcast preserved');
    t.equal(target.blocks.getBlock('boadcast shadow').fields.BROADCAST_OPTION.id, 'pre-existing broadcast id',
        'block field id remapped to existing broadcast');

    t.end();
});

test('fixUpVariableReferences is idempotent for broadcast references', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    addBroadcastBlocksTo(target);

    target.fixUpVariableReferences();
    const stageVarsAfterFirst = Object.keys(stage.variables).slice();
    const fieldIdAfterFirst = target.blocks.getBlock('boadcast shadow').fields.BROADCAST_OPTION.id;

    target.fixUpVariableReferences();

    t.same(Object.keys(stage.variables), stageVarsAfterFirst, 'no new stage broadcasts on second call');
    t.equal(target.blocks.getBlock('boadcast shadow').fields.BROADCAST_OPTION.id, fieldIdAfterFirst,
        'field id unchanged on second call');

    t.end();
});

test('fixUpVariableReferences on the stage does not rename existing stage variables', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;
    stage.name = 'Stage';

    runtime.targets = [stage];

    stage.createVariable('pre-existing global var id', 'a stage variable', Variable.SCALAR_TYPE);
    stage.blocks.createBlock({
        id: 'a stage block',
        opcode: 'data_variable',
        inputs: {},
        fields: {
            VARIABLE: {
                name: 'VARIABLE',
                id: 'pre-existing global var id',
                value: 'a stage variable',
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

    stage.fixUpVariableReferences();

    t.equal(Object.keys(stage.variables).length, 1, 'no duplicate stage variable');
    t.equal(stage.variables['pre-existing global var id'].name, 'a stage variable',
        'existing stage variable name not changed');
    t.equal(stage.blocks.getBlock('a stage block').fields.VARIABLE.id, 'pre-existing global var id',
        'block field id unchanged');

    t.end();
});

test('fixUpVariableReferences on the stage creates broadcasts for undefined references', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;
    stage.name = 'Stage';

    runtime.targets = [stage];

    addBroadcastBlocksTo(stage);

    t.equal(Object.keys(stage.variables).length, 0);

    stage.fixUpVariableReferences();

    t.equal(Object.keys(stage.variables).length, 1);
    const broadcast = stage.variables['mock broadcast message id'];
    t.ok(broadcast, 'broadcast created on stage');
    t.equal(broadcast.name, 'my message');
    t.equal(broadcast.type, Variable.BROADCAST_MESSAGE_TYPE);

    t.end();
});

test('reconcileVariableReferences creates a stage variable for an undefined variable reference', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    t.equal(Object.keys(stage.variables).length, 0);
    t.equal(Object.keys(target.variables).length, 0);

    target.reconcileVariableReferences();

    t.equal(Object.keys(stage.variables).length, 1, 'variable created on stage');
    const newVar = stage.variables['mock var id'];
    t.ok(newVar, 'variable preserves the original id');
    t.equal(newVar.name, 'a mock variable');
    t.equal(newVar.type, Variable.SCALAR_TYPE);
    t.equal(Object.keys(target.variables).length, 0, 'no variable on the sprite');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id');

    t.end();
});

test('reconcileVariableReferences creates a stage list for an undefined list reference', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    target.blocks.createBlock(adapter(events.mockListBlock)[0]);

    t.equal(Object.keys(stage.variables).length, 0);
    t.equal(target.blocks.getBlock('another block').fields.LIST.id, 'mock list id');
    t.equal(target.blocks.getBlock('another block').fields.LIST.value, 'a mock list');

    target.reconcileVariableReferences();

    t.equal(Object.keys(stage.variables).length, 1, 'list created on stage');
    const newList = stage.variables['mock list id'];
    t.ok(newList, 'list preserves the original id');
    t.equal(newList.name, 'a mock list');
    t.equal(newList.type, Variable.LIST_TYPE);
    t.equal(target.blocks.getBlock('another block').fields.LIST.id, 'mock list id');

    t.end();
});

test('reconcileVariableReferences remaps a list reference to an existing same-name stage list', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    stage.createVariable('pre-existing list id', 'a mock list', Variable.LIST_TYPE);
    target.blocks.createBlock(adapter(events.mockListBlock)[0]);

    target.reconcileVariableReferences();

    t.equal(Object.keys(stage.variables).length, 1, 'no duplicate list created');
    t.ok(stage.variables['pre-existing list id'], 'existing list preserved');
    t.equal(target.blocks.getBlock('another block').fields.LIST.id, 'pre-existing list id',
        'block field id remapped to existing list');

    t.end();
});

test('reconcileVariableReferences creates a stage broadcast for an undefined broadcast reference', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    addBroadcastBlocksTo(target);

    t.equal(Object.keys(stage.variables).length, 0);

    target.reconcileVariableReferences();

    t.equal(Object.keys(stage.variables).length, 1);
    const broadcast = stage.variables['mock broadcast message id'];
    t.ok(broadcast, 'broadcast created on stage');
    t.equal(broadcast.name, 'my message');
    t.equal(broadcast.type, Variable.BROADCAST_MESSAGE_TYPE);
    t.equal(target.blocks.getBlock('boadcast shadow').fields.BROADCAST_OPTION.id, 'mock broadcast message id');

    t.end();
});

test('reconcileVariableReferences remaps to an existing same-name stage variable', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    stage.createVariable('pre-existing global var id', 'a mock variable', Variable.SCALAR_TYPE);
    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    target.reconcileVariableReferences();

    t.equal(Object.keys(stage.variables).length, 1, 'no duplicate created');
    t.ok(stage.variables['pre-existing global var id'], 'existing variable preserved');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'pre-existing global var id',
        'block field id remapped to existing variable');

    t.end();
});

test('reconcileVariableReferences is idempotent', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    addBroadcastBlocksTo(target);

    target.reconcileVariableReferences();
    const stageVarsAfterFirst = Object.keys(stage.variables).slice();
    const fieldIdAfterFirst = target.blocks.getBlock('boadcast shadow').fields.BROADCAST_OPTION.id;

    target.reconcileVariableReferences();

    t.same(Object.keys(stage.variables), stageVarsAfterFirst, 'no new stage variables on second call');
    t.equal(target.blocks.getBlock('boadcast shadow').fields.BROADCAST_OPTION.id, fieldIdAfterFirst,
        'field id unchanged on second call');

    t.end();
});

test('reconcileVariableReferences does NOT rename a sprite local that name-collides with a stage global', t => {
    // This is the critical regression test that distinguishes reconcileVariableReferences from
    // fixUpVariableReferences. Project load runs only the repair-only helper on every target;
    // legitimate local-vs-global name collisions (a Scratch configuration that has always been
    // valid) must not be touched.
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    stage.createVariable('global var id', 'a mock variable', Variable.SCALAR_TYPE);
    target.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);
    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    target.reconcileVariableReferences();

    t.equal(target.variables['mock var id'].name, 'a mock variable',
        'sprite local variable not renamed by reconcile');
    t.equal(target.blocks.getBlock('a block').fields.VARIABLE.id, 'mock var id',
        'block field id unchanged');
    t.equal(Object.keys(stage.variables).length, 1, 'no new stage variables created');

    t.end();
});

test('reconcileVariableReferences on the stage creates broadcasts for undefined references', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;
    stage.name = 'Stage';

    runtime.targets = [stage];

    addBroadcastBlocksTo(stage);

    t.equal(Object.keys(stage.variables).length, 0);

    stage.reconcileVariableReferences();

    t.equal(Object.keys(stage.variables).length, 1);
    const broadcast = stage.variables['mock broadcast message id'];
    t.ok(broadcast);
    t.equal(broadcast.name, 'my message');
    t.equal(broadcast.type, Variable.BROADCAST_MESSAGE_TYPE);

    t.end();
});

const captureLogWarn = (fn: () => void) => {
    const original = log.warn;
    const messages: string[] = [];
    log.warn = (...args: unknown[]) => messages.push(args.join(' '));
    try {
        fn();
    } finally {
        log.warn = original;
    }
    return messages;
};

test('reconcileVariableReferences emits log.warn when it creates a stage definition', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    addBroadcastBlocksTo(target);

    const messages = captureLogWarn(() => target.reconcileVariableReferences());

    t.equal(messages.length, 1, 'one log.warn fired');
    t.match(messages[0], /Reconciled.*'Target'.*created.*'mock broadcast message id'/,
        'log message names the target and the created definition');

    t.end();
});

test('reconcileVariableReferences emits log.warn when it remaps a reference', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    stage.createVariable('pre-existing global var id', 'a mock variable', Variable.SCALAR_TYPE);
    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    const messages = captureLogWarn(() => target.reconcileVariableReferences());

    t.equal(messages.length, 1, 'one log.warn fired');
    t.match(messages[0], /Reconciled.*remapped.*'mock var id'.*'pre-existing global var id'/,
        'log message names the remap');

    t.end();
});

test('reconcileVariableReferences coalesces same-original-name dangling refs to one stage variable', t => {
    // Regression for an issue caught in review: when two dangling refs share an
    // original name+type and the name has to be bumped (because some other target
    // already uses it), the second ref must coalesce with the first rather than
    // create a second stage variable. A Scratcher who pasted two scripts referencing
    // what they called "score" almost certainly meant one variable, not two.
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    // Another sprite owns a local variable with the same name, forcing unusedName to bump.
    const otherSprite = new Target(runtime);
    otherSprite.isStage = false;
    otherSprite.name = 'Other';
    otherSprite.createVariable('other local id', 'shared name', Variable.SCALAR_TYPE);

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, otherSprite, target];

    // Two dangling refs with the same original name+type, distinct ids.
    target.blocks.createBlock({
        id: 'block A',
        opcode: 'data_variable',
        inputs: {},
        fields: {
            VARIABLE: {
                name: 'VARIABLE',
                id: 'dangling A',
                value: 'shared name',
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
    target.blocks.createBlock({
        id: 'block B',
        opcode: 'data_variable',
        inputs: {},
        fields: {
            VARIABLE: {
                name: 'VARIABLE',
                id: 'dangling B',
                value: 'shared name',
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

    target.reconcileVariableReferences();

    const stageVars = Object.values(stage.variables);
    t.equal(stageVars.length, 1, 'exactly one new stage variable was created');
    const created = stageVars[0];
    t.equal(created.type, Variable.SCALAR_TYPE);
    t.not(created.name, 'shared name', 'name was bumped to avoid the existing local');

    // Both block fields should now point to the same created stage variable
    // and display the same (bumped) name, otherwise users see one block named
    // "shared name" and another named "shared name2" pointing at the same variable.
    const fieldA = target.blocks.getBlock('block A').fields.VARIABLE;
    const fieldB = target.blocks.getBlock('block B').fields.VARIABLE;
    t.equal(fieldA.id, created.id, 'first dangling ref points at the created stage variable');
    t.equal(fieldB.id, created.id, 'second dangling ref coalesces to the same stage variable');
    t.equal(fieldA.value, created.name, 'first field displays the bumped name');
    t.equal(fieldB.value, created.name, 'second field displays the same bumped name');

    t.end();
});

test('reconcileVariableReferences normalizes field values across targets after a bump', t => {
    // Regression: when target A's reconcile pass creates a stage variable with a
    // bumped name (because of an external collision), a later target B that
    // references the same id by lookup must have its block field's displayed name
    // normalized too — otherwise the same variable shows different names in
    // different sprites' blocks.
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;
    stage.name = 'Stage';

    // External collision forces unusedName to bump.
    const otherSprite = new Target(runtime);
    otherSprite.isStage = false;
    otherSprite.name = 'Other';
    otherSprite.createVariable('other local id', 'shared name', Variable.SCALAR_TYPE);

    const targetA = new Target(runtime);
    targetA.isStage = false;
    targetA.name = 'TargetA';

    const targetB = new Target(runtime);
    targetB.isStage = false;
    targetB.name = 'TargetB';

    runtime.targets = [stage, otherSprite, targetA, targetB];

    const makeBlockReferencing = (blockId: string, fieldId: string, fieldValue: string): Block => ({
        id: blockId,
        opcode: 'data_variable',
        inputs: {},
        fields: {
            VARIABLE: {
                name: 'VARIABLE',
                id: fieldId,
                value: fieldValue,
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

    targetA.blocks.createBlock(makeBlockReferencing('block A', 'shared dangling id', 'shared name'));
    targetB.blocks.createBlock(makeBlockReferencing('block B', 'shared dangling id', 'shared name'));

    // Match what installTargets does on whole-project load: reconcile each target in turn.
    targetA.reconcileVariableReferences();
    targetB.reconcileVariableReferences();

    const stageVars = Object.values(stage.variables);
    t.equal(stageVars.length, 1, 'one stage variable created across both targets');
    const created = stageVars[0];
    t.not(created.name, 'shared name', 'name was bumped');

    const fieldA = targetA.blocks.getBlock('block A').fields.VARIABLE;
    const fieldB = targetB.blocks.getBlock('block B').fields.VARIABLE;
    t.equal(fieldA.value, created.name, 'target A field value matches the resolved variable name');
    t.equal(fieldB.value, created.name, 'target B field value matches the resolved variable name');

    t.end();
});

test('reconcileVariableReferences does not log on clean references', t => {
    const runtime = new Runtime();

    const stage = new Target(runtime);
    stage.isStage = true;

    const target = new Target(runtime);
    target.isStage = false;
    target.name = 'Target';

    runtime.targets = [stage, target];

    stage.createVariable('mock var id', 'a mock variable', Variable.SCALAR_TYPE);
    target.blocks.createBlock(adapter(events.mockVariableBlock)[0]);

    const messages = captureLogWarn(() => target.reconcileVariableReferences());

    t.equal(messages.length, 0, 'no log.warn fired on a clean reference');

    t.end();
});

const variableMonitorBlock = (id: string, value: string): Block => ({
    id, opcode: 'data_variable', inputs: {}, next: null, parent: null, shadow: false, topLevel: true,
    fields: {VARIABLE: {name: 'VARIABLE', id, value}}
});

test('renameVariable renames the monitor even when the editing target cannot see the variable', t => {
    const runtime = new Runtime();
    const stage = new Target(runtime);
    stage.isStage = true;
    const device = new Target(runtime);
    runtime.targets = [stage, device];
    runtime._editingTarget = stage;
    device.createVariable('v', 'old', Variable.SCALAR_TYPE);
    runtime.monitorBlocks.createBlock(variableMonitorBlock('v', 'old'));
    runtime.requestAddMonitor(MonitorRecord({id: 'v', params: {VARIABLE: 'old'}}));

    device.renameVariable('v', 'new');
    t.equal(runtime.monitorBlocks.getBlock('v').fields.VARIABLE.value, 'new');
    t.strictSame(runtime.monitors.getState().get('v').get('params'), {VARIABLE: 'new'});
    t.end();
});

test('deleteVariable removes its monitor', t => {
    const runtime = new Runtime();
    const target = new Target(runtime);
    target.createVariable('v', 'var', Variable.SCALAR_TYPE);
    runtime.monitorBlocks.createBlock(variableMonitorBlock('v', 'var'));
    runtime.requestAddMonitor(MonitorRecord({id: 'v'}));

    target.deleteVariable('v');
    t.equal(runtime.monitorBlocks.getBlock('v'), undefined);
    t.notOk(runtime.monitors.getState().has('v'));
    t.end();
});

test('deleteMonitors removes a device\'s monitors, or the stage\'s global variable monitors', t => {
    const runtime = new Runtime();
    const stage = new Target(runtime);
    stage.isStage = true;
    const device = new Target(runtime);
    stage.createVariable('global', 'global', Variable.SCALAR_TYPE);
    runtime.monitorBlocks.createBlock(variableMonitorBlock('global', 'global'));
    runtime.monitorBlocks.createBlock({...variableMonitorBlock('local', 'local'), targetId: device.id});
    runtime.monitorBlocks.createBlock(block('timer', 'sensing_timer'));

    device.deleteMonitors();
    t.strictSame(Object.keys(runtime.monitorBlocks._blocks), ['global', 'timer']);
    stage.deleteMonitors();
    t.strictSame(Object.keys(runtime.monitorBlocks._blocks), ['timer'], 'other stage monitors stay');
    t.end();
});

test('getName is the target name', t => {
    const target = new Target(new Runtime());
    target.name = 'Device';
    t.equal(target.getName(), 'Device');
    t.end();
});

test('toJSON describes the target', t => {
    const target = new Target(new Runtime());
    target.name = 'Device';
    target.createVariable('v', 'var', Variable.SCALAR_TYPE);
    t.strictSame(Object.keys(target.toJSON()), ['id', 'name', 'isStage', 'comments', 'blocks', 'variables']);
    t.match(target.toJSON(), {id: target.id, name: 'Device', isStage: false, variables: {v: {name: 'var'}}});
    t.end();
});

test('dispose stops the target and takes it out of execution', t => {
    const runtime = new Runtime();
    const target = new Target(runtime);
    runtime.addTarget(target);
    target.setCustomState('state', 1);
    const events: string[] = [];
    runtime.events.on('STOP_FOR_TARGET', stopped => events.push(`stop ${stopped === target}`));
    runtime.events.on('targetWasRemoved', removed => events.push(`removed ${removed === target}`));

    target.dispose();
    t.strictSame(events, ['stop true', 'removed true']);
    t.strictSame(runtime.executableTargets, []);
    t.equal(target.getCustomState('state'), undefined);
    t.end();
});
