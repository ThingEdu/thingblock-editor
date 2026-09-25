import {test} from 'tap';
import Runtime from '../../src/engine/runtime.ts';
import Thread from '../../src/engine/thread.ts';
import {block, newTarget} from '../fixtures/target.ts';
import type {Block} from '../../src/engine/block-types.ts';
import type {RuntimeEvents} from '../../src/engine/runtime/runtime-events.ts';

/** A runtime with one editing target holding `blocks`; `test_wait` yields until `release` is called. */
const setup = (...blocks: Block[]) => {
    const rt = new Runtime();
    // Bounds each step, since test_wait threads yield until released
    rt.currentStepTime = Runtime.THREAD_STEP_INTERVAL;
    const target = newTarget(rt, 'target', blocks);
    rt.targets.push(target);
    rt.executableTargets.push(target);
    rt._editingTarget = target;
    let waiting = true;
    rt._primitives.test_wait = (args, util) => {
        if (waiting) util.yield();
    };
    return {rt, target, release: () => {
        waiting = false;
    }};
};

const record = (rt: Runtime, ...names: Array<keyof RuntimeEvents>) => {
    const emitted: string[] = [];
    for (const name of names) {
        rt.events.on(name, () => emitted.push(name));
    }
    return emitted;
};

test('start steps on an interval once, and quit stops it', t => {
    const {rt} = setup();
    const emitted = record(rt, 'RUNTIME_STARTED');
    rt.start();
    rt.start();
    t.strictSame(emitted, ['RUNTIME_STARTED']);
    t.equal(rt.currentStepTime, Runtime.THREAD_STEP_INTERVAL);
    rt.quit();
    t.equal(rt._steppingInterval, null);
    t.end();
});

test('setCompatibilityMode restarts a running step loop at 30 TPS', t => {
    const {rt} = setup();
    rt.setCompatibilityMode(true);
    t.equal(rt._steppingInterval, null, 'a stopped runtime stays stopped');

    rt.setCompatibilityMode(false);
    rt.start();
    rt.setCompatibilityMode(true);
    t.equal(rt.currentStepTime, Runtime.THREAD_STEP_INTERVAL_COMPATIBILITY);
    rt.quit();
    t.end();
});

test('toggleScript starts a script, then stops it', t => {
    const {rt} = setup(block('wait', 'test_wait'));
    rt.toggleScript('wait');
    const [thread] = rt.threads;
    t.equal(thread.topBlock, 'wait');
    t.ok(rt.isActiveThread(thread));

    rt.toggleScript('wait');
    t.equal(thread.status, Thread.STATUS_DONE);
    t.equal(thread.isKilled, true);
    t.ok(rt.isWaitingThread(thread));

    rt._step();
    t.strictSame(rt.threads, []);
    t.end();
});

test('a clicked edge-activated hat runs alongside its stepping thread', t => {
    const {rt} = setup(block('edge', 'test_edge'));
    rt._hats.test_edge = {edgeActivated: true};
    const stepping = new Thread('edge', rt.targets[0], rt.targets[0].blocks);
    rt.threads.push(stepping);

    rt.toggleScript('edge', {stackClick: true});
    t.equal(rt.threads.length, 2);
    t.not(stepping.status, Thread.STATUS_DONE);
    t.end();
});

test('isWaitingThread covers promise and tick waits', t => {
    const {rt} = setup(block('wait', 'test_wait'));
    rt.toggleScript('wait');
    const [thread] = rt.threads;
    t.notOk(rt.isWaitingThread(thread));
    thread.status = Thread.STATUS_PROMISE_WAIT;
    t.ok(rt.isWaitingThread(thread));
    thread.status = Thread.STATUS_YIELD_TICK;
    t.ok(rt.isWaitingThread(thread));
    t.end();
});

test('stopForTarget stops the target threads except the exception', t => {
    const {rt, target} = setup(block('a', 'test_wait'), block('b', 'test_wait'));
    const stoppedTargets: unknown[] = [];
    rt.events.on('STOP_FOR_TARGET', stopped => stoppedTargets.push(stopped));
    rt.toggleScript('a');
    rt.toggleScript('b');
    const [a, b] = rt.threads;

    rt.stopForTarget(target, b);
    t.strictSame(stoppedTargets, [target]);
    t.equal(a.status, Thread.STATUS_DONE);
    t.not(b.status, Thread.STATUS_DONE);
    t.end();
});

test('greenFlag stops everything and starts the flag hats', t => {
    const {rt} = setup(block('other', 'test_wait'), block('flag', 'event_whenflagclicked', {next: 'body'}),
        block('body', 'test_wait', {parent: 'flag', topLevel: false}));
    const emitted = record(rt, 'PROJECT_STOP_ALL', 'PROJECT_START');
    rt.toggleScript('other');

    rt.greenFlag();
    t.strictSame(emitted, ['PROJECT_STOP_ALL', 'PROJECT_START']);
    t.strictSame(rt.threads.map(thread => thread.topBlock), ['flag']);
    t.equal(rt.threads[0].peekStack(), 'body', 'the hat already ran');
    t.end();
});

test('_step reports the project running and stopping, ignoring monitor threads', t => {
    const {rt, release} = setup(block('wait', 'test_wait'));
    rt.monitorBlocks.createBlock({...block('mon', 'test_wait'), isMonitored: true});
    const emitted = record(rt, 'PROJECT_RUN_START', 'PROJECT_RUN_STOP');

    rt._step();
    t.strictSame(emitted, [], 'a monitor thread alone is not a running project');
    t.equal(rt.threads.filter(thread => thread.updateMonitor).length, 1);

    rt.toggleScript('wait');
    rt._step();
    t.strictSame(emitted, ['PROJECT_RUN_START']);

    release();
    rt._step();
    t.ok(rt._lastStepDoneThreads.some(thread => thread.topBlock === 'wait'));
    t.strictSame(emitted, ['PROJECT_RUN_START'], 'a thread that finished this step still counts');

    rt._step();
    t.strictSame(emitted, ['PROJECT_RUN_START', 'PROJECT_RUN_STOP']);
    t.end();
});

test('addMonitorScript does not queue a monitor script twice', t => {
    const {rt} = setup();
    rt.monitorBlocks.createBlock(block('mon', 'test_wait'));
    rt.addMonitorScript('mon');
    rt.addMonitorScript('mon');
    t.equal(rt.threads.length, 1);
    t.equal(rt.threads[0].target, rt.getEditingTarget());
    t.end();
});

test('_step emits a requested targets update once', t => {
    const {rt} = setup();
    const updates: boolean[] = [];
    rt.events.on('TARGETS_UPDATE', emitProjectChanged => updates.push(emitProjectChanged));
    rt.requestTargetsUpdate();
    rt._step();
    rt._step();
    t.strictSame(updates, [false]);
    t.end();
});

test('glows follow the editing target scripts that run', t => {
    const {rt, release} = setup(block('wait', 'test_wait'));
    const glows: string[] = [];
    rt.events.on('SCRIPT_GLOW_ON', ({id}) => glows.push(`on ${id}`));
    rt.events.on('SCRIPT_GLOW_OFF', ({id}) => glows.push(`off ${id}`));

    rt.toggleScript('wait');
    rt._step();
    rt._step();
    t.strictSame(glows, ['on wait'], 'a script glows once while it runs');

    release();
    rt._step();
    rt._step();
    t.strictSame(glows, ['on wait', 'off wait']);
    t.end();
});

test('quietGlow forgets a glow without a glow-off', t => {
    const {rt} = setup(block('wait', 'test_wait'));
    const glows: string[] = [];
    rt.events.on('SCRIPT_GLOW_OFF', ({id}) => glows.push(id));
    rt.toggleScript('wait');
    rt._step();

    rt.quietGlow('wait');
    rt.stopAll();
    rt._step();
    t.strictSame(glows, []);
    t.end();
});

test('glowBlock and glowScript emit their events', t => {
    const {rt} = setup();
    const emitted = record(rt, 'BLOCK_GLOW_ON', 'BLOCK_GLOW_OFF', 'SCRIPT_GLOW_ON', 'SCRIPT_GLOW_OFF');
    rt.glowBlock('a', true);
    rt.glowBlock('a', false);
    rt.glowScript('a', true);
    rt.glowScript('a', false);
    t.strictSame(emitted, ['BLOCK_GLOW_ON', 'BLOCK_GLOW_OFF', 'SCRIPT_GLOW_ON', 'SCRIPT_GLOW_OFF']);
    t.end();
});

test('allScriptsDo visits scripts in execution order', t => {
    const {rt} = setup(block('first', 'test_wait'));
    const last = newTarget(rt, 'last', [block('second', 'test_wait')]);
    rt.executableTargets.unshift(last);
    const visited: string[] = [];
    rt.allScriptsDo((topBlockId, target) => visited.push(`${target.id}:${topBlockId}`));
    t.strictSame(visited, ['target:first', 'last:second']);
    t.end();
});

test('setEditingTarget asks for a toolbox update when the target changes', t => {
    const {rt, target} = setup();
    const emitted = record(rt, 'TOOLBOX_EXTENSIONS_NEED_UPDATE');
    rt.setEditingTarget(target);
    rt.setEditingTarget(newTarget(rt, 'other'));
    t.strictSame(emitted, ['TOOLBOX_EXTENSIONS_NEED_UPDATE']);
    t.end();
});
