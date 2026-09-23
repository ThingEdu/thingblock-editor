import {test} from 'tap';
import Runtime from '../../src/engine/runtime.ts';
import Variable from '../../src/engine/variable.ts';
import MonitorRecord from '../../src/engine/monitor-record.ts';
import {block, newTarget} from '../fixtures/target.ts';

/** A runtime with a stage and `ids` devices, added in order. */
const setup = (...ids: string[]) => {
    const rt = new Runtime();
    const stage = newTarget(rt, 'stage');
    stage.isStage = true;
    rt.addTarget(stage);
    const devices = ids.map(id => newTarget(rt, id));
    devices.forEach(device => rt.addTarget(device));
    return {rt, stage, devices};
};

const executionIds = (rt: Runtime) => rt.executableTargets.map(target => target.id);

test('addTarget appends to the targets and executable targets', t => {
    const {rt} = setup('a', 'b');
    t.strictSame(rt.targets.map(target => target.id), ['stage', 'a', 'b']);
    t.strictSame(executionIds(rt), ['stage', 'a', 'b']);
    t.end();
});

test('moveExecutable clamps the new position and keeps the stage at the end', t => {
    const {rt, devices: [a, , c]} = setup('a', 'b', 'c');
    t.equal(rt.moveExecutable(a, 1), 2);
    t.strictSame(executionIds(rt), ['stage', 'b', 'a', 'c']);
    t.equal(rt.moveExecutable(a, 10), 3);
    t.strictSame(executionIds(rt), ['stage', 'b', 'c', 'a']);
    t.equal(rt.moveExecutable(c, -10), 1, 'the stage keeps running last');
    t.strictSame(executionIds(rt), ['stage', 'c', 'b', 'a']);
    t.end();
});

test('moveExecutable can move a target to the end when there is no stage', t => {
    const rt = new Runtime();
    const [a, b] = ['a', 'b'].map(id => newTarget(rt, id));
    rt.addTarget(a);
    rt.addTarget(b);
    t.equal(rt.moveExecutable(b, -5), 0);
    t.strictSame(executionIds(rt), ['b', 'a']);
    t.end();
});

test('setExecutablePosition places a target, Infinity running it first', t => {
    const {rt, devices: [a]} = setup('a', 'b');
    t.equal(rt.setExecutablePosition(a, Infinity), 2);
    t.strictSame(executionIds(rt), ['stage', 'b', 'a']);
    t.equal(rt.setExecutablePosition(a, 0), 1);
    t.strictSame(executionIds(rt), ['stage', 'a', 'b']);
    t.end();
});

test('removeExecutable takes a target out of execution only', t => {
    const {rt, devices: [a]} = setup('a');
    rt.removeExecutable(a);
    rt.removeExecutable(a);
    t.strictSame(executionIds(rt), ['stage']);
    t.equal(rt.targets.length, 2);
    t.end();
});

test('disposeTarget disposes a runtime target once', t => {
    const {rt, devices: [a]} = setup('a');
    let removed = 0;
    rt.events.on('targetWasRemoved', () => removed++);
    rt.disposeTarget(a);
    rt.disposeTarget(a);
    t.strictSame(rt.targets.map(target => target.id), ['stage']);
    t.strictSame(executionIds(rt), ['stage']);
    t.equal(removed, 1);
    t.end();
});

test('dispose removes targets and monitors, and resets the project timer', t => {
    const {rt, stage} = setup('a');
    stage.createVariable('global', 'global', Variable.SCALAR_TYPE);
    rt.monitorBlocks.createBlock(block('global', 'data_variable'));
    rt.requestAddMonitor(MonitorRecord({id: 'global'}));
    rt.currentMSecs += 5000;
    let disposed = false;
    rt.events.on('RUNTIME_DISPOSED', () => {
        disposed = true;
    });

    rt.dispose();
    t.strictSame(rt.targets, []);
    t.strictSame(rt.executableTargets, []);
    t.equal(rt.monitorBlocks.getBlock('global'), undefined);
    t.equal(rt.monitors.getState().size, 0);
    t.ok(disposed);
    t.equal(rt.ioDevices.clock.projectTimer(), 0);
    t.end();
});

test('getAllVarNamesOfType lists the names of that type on every target', t => {
    const {rt, stage, devices: [a]} = setup('a');
    stage.createVariable('g', 'global', Variable.SCALAR_TYPE);
    stage.createVariable('l', 'list', Variable.LIST_TYPE);
    a.createVariable('v', 'local', Variable.SCALAR_TYPE);
    t.strictSame(rt.getAllVarNamesOfType(Variable.SCALAR_TYPE), ['global', 'local']);
    t.strictSame(rt.getAllVarNamesOfType(Variable.LIST_TYPE), ['list']);
    t.end();
});

test('createNewGlobalVariable adds a stage variable with an unused name', t => {
    const {rt, stage, devices: [a]} = setup('a');
    a.createVariable('v', 'score', Variable.SCALAR_TYPE);
    const variable = rt.createNewGlobalVariable('score', 'id');
    t.match(variable, {id: 'id', name: 'score2', type: Variable.SCALAR_TYPE});
    t.equal(stage.variables.id, variable);

    const list = rt.createNewGlobalVariable('items', null, Variable.LIST_TYPE);
    t.equal(list.type, Variable.LIST_TYPE);
    t.equal(stage.variables[list.id], list);
    t.end();
});

test('createNewGlobalVariable throws without a stage', t => {
    t.throws(() => new Runtime().createNewGlobalVariable('score'), /no stage to hold global variable score/);
    t.end();
});

test('project events: loaded, changed and target created', t => {
    const {rt, devices: [a]} = setup('a');
    const emitted: string[] = [];
    rt.events.on('PROJECT_LOADED', () => emitted.push('loaded'));
    rt.events.on('PROJECT_CHANGED', () => emitted.push('changed'));
    rt.events.on('targetWasCreated', created => emitted.push(`created ${created.id}`));
    rt.handleProjectLoaded();
    rt.emitProjectChanged();
    rt.fireTargetWasCreated(a);
    t.strictSame(emitted, ['loaded', 'changed', 'created a']);
    t.end();
});
