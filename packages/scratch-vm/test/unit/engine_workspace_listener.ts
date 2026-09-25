import {test} from 'tap';
import Runtime from '../../src/engine/runtime.ts';
import Variable from '../../src/engine/variable.ts';
import MonitorRecord from '../../src/engine/monitor-record.ts';
import log from '../../src/util/log';
import {block, newTarget} from '../fixtures/target.ts';
import type {WorkspaceEvent} from '../../src/engine/runtime/workspace-listener.ts';
import type {RuntimeEvents} from '../../src/engine/runtime/runtime-events.ts';

/** A runtime with a stage and a device, which is the editing target. */
const setup = () => {
    const rt = new Runtime();
    const stage = newTarget(rt, 'stage');
    stage.isStage = true;
    const device = newTarget(rt, 'device');
    rt.addTarget(stage);
    rt.addTarget(device);
    rt._editingTarget = device;
    const listener = rt.workspaceListener;
    return {rt, stage, device, listener};
};

const record = (rt: Runtime, ...names: Array<keyof RuntimeEvents>) => {
    const emitted: string[] = [];
    for (const name of names) {
        rt.events.on(name, () => emitted.push(name));
    }
    return emitted;
};

const create = (outerHTML: string): WorkspaceEvent => ({type: 'create', blockId: '', xml: {outerHTML}});

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

test('the runtime owns a listener', t => {
    const {rt, listener} = setup();
    t.equal(listener.runtime, rt);
    t.end();
});

test('blockListener ignores events until there is an editing target', t => {
    const {rt, device, listener} = setup();
    rt._editingTarget = null;
    listener.blockListener(create('<block type="test" id="a"></block>'));
    t.equal(device.blocks.getBlock('a'), undefined);
    t.end();
});

test('a create event adds the whole stack to the editing target', t => {
    const {rt, device, listener} = setup();
    const emitted = record(rt, 'PROJECT_CHANGED');
    listener.blockListener(create('<block type="test" id="a"><next><block type="test" id="b"></block></next></block>'));
    t.match(device.blocks.getBlock('a'), {next: 'b', topLevel: true});
    t.match(device.blocks.getBlock('b'), {parent: 'a', topLevel: false});
    t.ok(emitted.length > 0);
    t.end();
});

test('a field change sets the value; a variable field takes the variable name and ID', t => {
    const {stage, device, listener} = setup();
    device.blocks.createBlock(block('a', 'test', {fields: {TEXT: {name: 'TEXT', value: 'old'}}}));
    device.blocks.createBlock(block('v', 'data_variable', {fields: {VARIABLE: {name: 'VARIABLE', id: 'x', value: 'x'}}}));
    stage.createVariable('global', 'score', Variable.SCALAR_TYPE);

    listener.blockListener({type: 'change', blockId: 'a', element: 'field', name: 'TEXT', newValue: 'new'});
    t.equal(device.blocks.getBlock('a').fields.TEXT.value, 'new');

    listener.blockListener({type: 'change', blockId: 'v', element: 'field', name: 'VARIABLE', newValue: 'global'});
    t.strictSame(device.blocks.getBlock('v').fields.VARIABLE, {name: 'VARIABLE', id: 'global', value: 'score'});

    listener.blockListener({type: 'change', blockId: 'v', element: 'field', name: 'VARIABLE', newValue: 'unknown'});
    t.equal(device.blocks.getBlock('v').fields.VARIABLE.id, 'global', 'an unknown variable changes nothing');
    t.end();
});

test('an intermediate field change sets the value without a project change', t => {
    const {rt, device, listener} = setup();
    device.blocks.createBlock(block('a', 'test', {fields: {TEXT: {name: 'TEXT', value: 'old'}}}));
    const emitted = record(rt, 'PROJECT_CHANGED');
    listener.blockListener({type: 'block_field_intermediate_change', blockId: 'a', name: 'TEXT', newValue: 'ne'});
    t.equal(device.blocks.getBlock('a').fields.TEXT.value, 'ne');
    t.strictSame(emitted, []);
    t.end();
});

test('a mutation change adapts the mutation XML', t => {
    const {device, listener} = setup();
    device.blocks.createBlock(block('call', 'procedures_call'));
    listener.blockListener({
        type: 'change', blockId: 'call', element: 'mutation',
        newValue: '<mutation proccode="go %s" warp="false"></mutation>'
    });
    t.match(device.blocks.getBlock('call').mutation, {tagName: 'mutation', proccode: 'go %s', warp: 'false'});
    t.end();
});

test('a move event reparents the block', t => {
    const {device, listener} = setup();
    device.blocks.createBlock(block('a', 'test'));
    device.blocks.createBlock(block('b', 'test'));
    listener.blockListener({type: 'move', blockId: 'b', newParentId: 'a'});
    t.equal(device.blocks.getBlock('a').next, 'b');
    t.strictSame(device.blocks.getScripts(), ['a']);
    t.end();
});

test('a delete event deletes the block and quiets a top-level glow, but skips shadows', t => {
    const {rt, device, listener} = setup();
    device.blocks.createBlock(block('a', 'test'));
    device.blocks.createBlock(block('shadow', 'text', {shadow: true, topLevel: false}));
    const quieted: string[] = [];
    rt.quietGlow = id => quieted.push(id);

    listener.blockListener({type: 'delete', blockId: 'shadow'});
    listener.blockListener({type: 'delete', blockId: 'missing'});
    t.ok(device.blocks.getBlock('shadow'));
    listener.blockListener({type: 'delete', blockId: 'a'});
    t.equal(device.blocks.getBlock('a'), undefined);
    t.strictSame(quieted, ['a']);
    t.end();
});

test('drag events report blocks over the GUI and blocks dropped on it', t => {
    const {rt, listener} = setup();
    const updates: boolean[] = [];
    const drops: unknown[] = [];
    rt.events.on('BLOCK_DRAG_UPDATE', over => updates.push(over));
    rt.events.on('BLOCK_DRAG_END', (blocks, topBlockId) => drops.push([blocks.length, topBlockId]));
    const xml = {outerHTML: '<block type="test" id="copy"></block>'};

    listener.blockListener({type: 'dragOutside', isOutside: true});
    listener.blockListener({type: 'endDrag', blockId: 'a', isOutside: false, xml});
    listener.blockListener({type: 'endDrag', blockId: 'a', isOutside: true, xml});
    t.strictSame(updates, [true, false, false]);
    t.strictSame(drops, [[1, 'a']]);
    t.end();
});

test('clicking a block toggles its script as a stack click', t => {
    const {rt, device, listener} = setup();
    device.blocks.createBlock(block('top', 'test', {next: 'b'}));
    device.blocks.createBlock(block('b', 'test', {parent: 'top', topLevel: false}));
    listener.blockListener({type: 'click', blockId: 'b', targetType: 'workspace'});
    t.strictSame(rt.threads, []);
    listener.blockListener({type: 'click', blockId: 'b', targetType: 'block'});
    t.match(rt.threads, [{topBlock: 'top', stackClick: true}]);
    t.end();
});

test('flyoutBlockListener applies block events to the flyout blocks only', t => {
    const {rt, device, listener} = setup();
    listener.flyoutBlockListener(create('<block type="test" id="f"></block>'));
    listener.flyoutBlockListener({type: 'change', blockId: 'f', element: 'checkbox', newValue: true});
    listener.flyoutBlockListener({type: 'var_create', varId: 'v', varName: 'v', varType: ''});
    t.ok(rt.flyoutBlocks.getBlock('f'));
    t.equal(device.blocks.getBlock('f'), undefined);
    t.notOk(rt.flyoutBlocks.getBlock('f').isMonitored, 'checkboxes belong to the monitor listener');
    t.equal(rt.monitors.getState().size, 0);
    t.strictSame(rt.targets.map(target => Object.keys(target.variables)), [[], []]);
    t.end();
});

test('monitorBlockListener follows creation and changes, and a checkbox shows the monitor', t => {
    const {rt, listener} = setup();
    listener.monitorBlockListener(create('<block type="test_reporter" id="r"></block>'));
    listener.monitorBlockListener({type: 'move', blockId: 'r', newCoordinate: {x: 5, y: 5}});
    listener.monitorBlockListener({type: 'delete', blockId: 'r'});
    t.match(rt.monitorBlocks.getBlock('r'), {x: undefined}, 'moves and deletes are ignored');

    listener.monitorBlockListener({type: 'change', blockId: 'r', element: 'checkbox', newValue: true});
    t.match(rt.monitors.getState().get('r').toJS(), {id: 'r', visible: true});
    t.end();
});

test('monitorBlockListener updates a monitor label when its menu changes', t => {
    const {rt, listener} = setup();
    listener.monitorBlockListener(create(
        '<block type="test_reporter" id="r"><value name="PIN"><shadow type="test_menu" id="menu">' +
        '<field name="PIN">1</field></shadow></value></block>'
    ));
    rt.monitorBlocks.getBlock('r').isMonitored = true;
    rt.requestAddMonitor(MonitorRecord({id: 'r', params: {PIN: '1'}}));

    listener.monitorBlockListener({type: 'change', blockId: 'menu', element: 'field', name: 'PIN', newValue: '2'});
    t.strictSame(rt.monitors.getState().get('r').get('params'), {PIN: '2'});
    t.end();
});

test('var_create makes a local variable, or a global one that no target name conflicts with', t => {
    const {rt, stage, device, listener} = setup();
    const emitted = record(rt, 'PROJECT_CHANGED');
    listener.blockListener({type: 'var_create', varId: 'l', varName: 'local', varType: '', isLocal: true});
    listener.blockListener({type: 'var_create', varId: 'g', varName: 'global', varType: '', dataType: 'int'});
    listener.blockListener({type: 'var_create', varId: 'g2', varName: 'local', varType: ''});
    listener.blockListener({type: 'var_create', varId: 'g', varName: 'again', varType: ''});
    t.strictSame(Object.keys(device.variables), ['l']);
    t.strictSame(Object.keys(stage.variables), ['g']);
    t.match(stage.variables.g, {name: 'global', dataType: 'int'});
    t.equal(emitted.length, 2, 'only a created variable changes the project');

    rt._editingTarget = stage;
    listener.blockListener({type: 'var_create', varId: 's', varName: 'stage local', varType: '', isLocal: true});
    t.ok(stage.variables.s, 'the stage has no locals, so it gets a global');
    t.end();
});

test('var_rename renames a local on the editing target, or a global on every target', t => {
    const {stage, device, listener} = setup();
    const other = newTarget(device.runtime, 'other');
    device.runtime.addTarget(other);
    device.createVariable('l', 'local', Variable.SCALAR_TYPE);
    stage.createVariable('g', 'global', Variable.SCALAR_TYPE);
    const uses = (id: string, value: string) => block(`use ${id}`, 'data_variable', {
        fields: {VARIABLE: {name: 'VARIABLE', id, value}}
    });
    device.blocks.createBlock(uses('l', 'local'));
    other.blocks.createBlock(uses('g', 'global'));

    listener.blockListener({type: 'var_rename', varId: 'l', newName: 'local2'});
    listener.variableListener({type: 'var_rename', varId: 'g', newName: 'global2'});
    t.equal(device.variables.l.name, 'local2');
    t.equal(device.blocks.getBlock('use l').fields.VARIABLE.value, 'local2');
    t.equal(stage.variables.g.name, 'global2');
    t.equal(other.blocks.getBlock('use g').fields.VARIABLE.value, 'global2');
    t.end();
});

test('var_delete deletes a local, or else a global', t => {
    const {stage, device, listener} = setup();
    device.createVariable('l', 'local', Variable.SCALAR_TYPE);
    stage.createVariable('g', 'global', Variable.SCALAR_TYPE);
    listener.blockListener({type: 'var_delete', varId: 'l'});
    listener.blockListener({type: 'var_delete', varId: 'g'});
    t.strictSame(device.variables, {});
    t.strictSame(stage.variables, {});
    t.end();
});

test('variableListener ignores events other than variable ones', t => {
    const {stage, listener} = setup();
    listener.variableListener(create('<block type="test" id="a"></block>'));
    t.equal(stage.blocks.getBlock('a'), undefined);
    t.end();
});

test('comment events create, edit and delete comments on the editing target', t => {
    const {rt, device, listener} = setup();
    const emitted = record(rt, 'PROJECT_CHANGED');
    const json = {x: 1, y: 2, width: 200, height: 300};
    listener.blockListener({type: 'comment_create', commentId: 'c', json});
    listener.blockListener({type: 'comment_change', commentId: 'c', newContents_: 'text'});
    listener.blockListener({type: 'comment_move', commentId: 'c', newCoordinate_: {x: 3, y: 4}});
    listener.blockListener({type: 'comment_collapse', commentId: 'c', newCollapsed: true});
    listener.blockListener({type: 'comment_resize', commentId: 'c', newSize: {width: 50, height: 60}});
    t.match(device.comments.c, {text: 'text', x: 3, y: 4, minimized: true, width: 50, height: 60, blockId: null});

    listener.blockListener({type: 'comment_delete', commentId: 'c'});
    t.strictSame(device.comments, {});
    t.equal(emitted.length, 6);
    t.end();
});

test('a block comment attaches to its block, and its delete detaches it', t => {
    const {device, listener} = setup();
    device.blocks.createBlock(block('a', 'test'));
    listener.blockListener({
        type: 'block_comment_create', commentId: 'c', blockId: 'a', json: {x: 0, y: 0, width: 200, height: 200}
    });
    t.equal(device.blocks.getBlock('a').comment, 'c');
    listener.blockListener({type: 'block_comment_delete', commentId: 'c', blockId: 'a'});
    t.equal(device.blocks.getBlock('a').comment, undefined);
    t.end();
});

test('events for a missing comment warn, except delete, and change nothing', t => {
    const {rt, listener} = setup();
    const emitted = record(rt, 'PROJECT_CHANGED');
    const messages = captureLogWarn(() => {
        listener.blockListener({type: 'comment_change', commentId: 'gone', newContents_: 'x'});
        listener.blockListener({type: 'block_comment_move', commentId: 'gone', newCoordinate_: {x: 0, y: 0}});
        listener.blockListener({type: 'comment_delete', commentId: 'gone'});
    });
    t.match(messages, [/Cannot change comment with id gone/, /Cannot move comment with id gone/]);
    t.strictSame(emitted, []);
    t.end();
});

test('deleting a block comment whose block is gone still changes the project', t => {
    const {rt, device, listener} = setup();
    device.createComment('c', 'gone', 'text', 0, 0, 200, 200, false);
    const emitted = record(rt, 'PROJECT_CHANGED');
    const messages = captureLogWarn(() => {
        listener.blockListener({type: 'block_comment_delete', commentId: 'c', blockId: 'gone'});
    });
    t.strictSame(device.comments, {});
    t.match(messages, [/Could not find block referenced by comment with id: c/]);
    t.strictSame(emitted, ['PROJECT_CHANGED']);
    t.end();
});
