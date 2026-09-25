import {test} from 'tap';
import Runtime from '../../src/engine/runtime.ts';
import Thread from '../../src/engine/thread.ts';
import execute from '../../src/engine/execute.ts';
import MonitorRecord from '../../src/engine/monitor-record.ts';
import {block, newTarget} from '../fixtures/target.ts';
import type {Block} from '../../src/engine/block-types.ts';

const input = (name: string, blockId: string | null, shadow: string | null = null) =>
    ({[name]: {name, block: blockId, shadow}});

/** A runtime with one target holding `blocks`; `test_log` records the args it runs with. */
const setup = (...blocks: Block[]) => {
    const rt = new Runtime();
    rt.currentStepTime = Infinity;
    const target = newTarget(rt, 'target', blocks);
    rt.targets.push(target);
    rt.executableTargets.push(target);
    const logged: Array<Record<string, unknown>> = [];
    rt._primitives.test_log = args => {
        logged.push({...args});
    };
    const newThread = (topBlockId: string) => {
        const thread = new Thread(topBlockId, target, target.blocks);
        thread.pushStack(topBlockId);
        rt.threads.push(thread);
        return thread;
    };
    return {rt, target, logged, newThread};
};

/** Lets pending promise callbacks run. */
const flush = () => new Promise(resolve => setImmediate(resolve));

test('reporters and shadows fill the block arguments', t => {
    const {rt, logged, newThread} = setup(
        block('log', 'test_log', {inputs: {...input('A', 'rep'), ...input('B', 'text', 'text')}}),
        block('rep', 'test_five', {parent: 'log', topLevel: false}),
        block('text', 'text', {parent: 'log', topLevel: false, shadow: true, fields: {TEXT: {name: 'TEXT', value: 'hi'}}})
    );
    rt._primitives.test_five = () => 5;
    execute(rt.sequencer, newThread('log'));
    t.match(logged, [{A: 5, B: 'hi'}]);
    t.end();
});

test('a reporter promise pauses the block, which resumes without rerunning earlier reporters', async t => {
    const {rt, logged, newThread} = setup(
        block('log', 'test_log', {inputs: {...input('A', 'sync'), ...input('B', 'async')}}),
        block('sync', 'test_sync', {parent: 'log', topLevel: false}),
        block('async', 'test_async', {parent: 'log', topLevel: false})
    );
    let syncRuns = 0;
    let resolve: (value: unknown) => void;
    rt._primitives.test_sync = () => ++syncRuns;
    rt._primitives.test_async = () => new Promise(r => {
        resolve = r;
    });
    const thread = newThread('log');

    rt.sequencer.stepThread(thread);
    t.equal(thread.status, Thread.STATUS_PROMISE_WAIT);
    t.strictSame(logged, []);

    resolve('later');
    await flush();
    t.equal(thread.status, Thread.STATUS_RUNNING);

    rt.sequencer.stepThread(thread);
    t.match(logged, [{A: 1, B: 'later'}]);
    t.equal(syncRuns, 1);
    t.equal(thread.status, Thread.STATUS_DONE);
});

test('a command promise moves the thread to the next block once it resolves', async t => {
    const {rt, logged, newThread} = setup(
        block('async', 'test_async', {next: 'log'}),
        block('log', 'test_log', {parent: 'async', topLevel: false})
    );
    let resolve: () => void;
    rt._primitives.test_async = () => new Promise<void>(r => {
        resolve = r;
    });
    const thread = newThread('async');

    rt.sequencer.stepThread(thread);
    resolve();
    await flush();
    t.equal(thread.peekStack(), 'log');

    rt.sequencer.stepThread(thread);
    t.equal(logged.length, 1);
    t.equal(thread.status, Thread.STATUS_DONE);
});

test('a reporter plugged into a broadcast input is saved while the broadcast waits on a promise', t => {
    const {rt, newThread} = setup(
        block('broadcast', 'test_broadcast', {inputs: input('BROADCAST_INPUT', 'rep', 'menu')}),
        block('rep', 'test_name', {parent: 'broadcast', topLevel: false})
    );
    rt._primitives.test_name = () => 'message';
    rt._primitives.test_broadcast = () => new Promise(() => {});
    const thread = newThread('broadcast');

    execute(rt.sequencer, thread);
    t.strictSame(thread.peekStackFrame().reported, [{opCached: 'rep', inputValue: 'message'}]);
    t.end();
});

test('a hat whose predicate is false retires its thread', t => {
    const {rt} = setup(block('hat', 'test_hat', {next: null}));
    rt._hats.test_hat = {};
    let predicate = false;
    rt._primitives.test_hat = () => predicate;

    const [stopped] = rt.startHats('test_hat');
    t.equal(stopped.status, Thread.STATUS_DONE);

    rt.threads = [];
    predicate = true;
    const [running] = rt.startHats('test_hat');
    t.not(running.status, Thread.STATUS_DONE);
    t.end();
});

test('an edge-activated hat runs only when its predicate turns true', t => {
    const {rt} = setup(block('edge', 'test_edge'));
    rt._hats.test_edge = {edgeActivated: true};
    let predicate = true;
    rt._primitives.test_edge = () => predicate;
    const startEdge = () => {
        rt.threads = [];
        return rt.startHats('test_edge')[0].status !== Thread.STATUS_DONE;
    };

    t.equal(startEdge(), true, 'the first true activates');
    t.equal(startEdge(), false, 'staying true does not');
    predicate = false;
    t.equal(startEdge(), false);
    predicate = true;
    t.equal(startEdge(), true, 'false to true activates again');
    t.end();
});

test('a clicked reporter shows its value', t => {
    const {rt} = setup(block('rep', 'test_five'));
    rt._primitives.test_five = () => 5;
    const reports: unknown[] = [];
    rt.events.on('VISUAL_REPORT', report => reports.push(report));

    rt._editingTarget = rt.targets[0];
    rt.toggleScript('rep', {stackClick: true});
    rt.sequencer.stepThreads();
    t.strictSame(reports, [{id: 'rep', value: '5'}]);
    t.end();
});

test('a monitor thread updates its monitor value', t => {
    const {rt, target} = setup();
    rt._primitives.test_five = () => 5;
    rt.monitorBlocks.createBlock(block('mon', 'test_five'));
    rt.requestAddMonitor(MonitorRecord({id: 'mon'}));

    rt.addMonitorScript('mon', target);
    rt.sequencer.stepThreads();
    t.equal(rt.monitors.getState().get('mon').get('value'), 5);
    t.end();
});

test('a monitor thread whose block is missing from the monitor blocks throws', t => {
    const {rt, target} = setup();
    rt._primitives.test_five = () => 5;
    rt.flyoutBlocks.createBlock(block('flyout', 'test_five'));
    rt.addMonitorScript('flyout', target);
    t.throws(() => rt.sequencer.stepThreads(), /monitor thread flyout runs missing block flyout/);
    t.end();
});

test('a missing block retires the thread', t => {
    const {rt, newThread} = setup();
    const thread = newThread('gone');
    execute(rt.sequencer, thread);
    t.equal(thread.status, Thread.STATUS_DONE);
    t.end();
});
