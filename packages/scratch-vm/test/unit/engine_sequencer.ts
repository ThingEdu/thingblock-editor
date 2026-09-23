import '../fixtures/prefer-ts';
import {test} from 'tap';
import Runtime from '../../src/engine/runtime.ts';
import Sequencer from '../../src/engine/sequencer.ts';
import Thread from '../../src/engine/thread.ts';
import BlockUtility from '../../src/engine/block-utility.ts';
import {block, newTarget} from '../fixtures/target.ts';
import type {Block} from '../../src/engine/block-types.ts';

/** A runtime with one target holding `blocks`, and a `test_command` primitive that logs its block's ARG field. */
const setup = (...blocks: Block[]) => {
    const rt = new Runtime();
    rt.currentStepTime = Infinity;
    const target = newTarget(rt, 'target', blocks);
    rt.targets.push(target);
    rt.executableTargets.push(target);
    const ran: unknown[] = [];
    rt._primitives.test_command = (args: {ARG?: unknown}) => {
        ran.push(args.ARG);
    };
    const newThread = (topBlockId: string) => {
        const thread = new Thread(topBlockId, target, target.blocks);
        thread.pushStack(topBlockId);
        rt.threads.push(thread);
        return thread;
    };
    return {rt, s: rt.sequencer, target, ran, newThread};
};

const command = (id: string, next: string | null = null, rest: Partial<Block> = {}) =>
    block(id, 'test_command', {next, fields: {ARG: {name: 'ARG', value: id}}, ...rest});

test('the runtime owns one sequencer, which owns the block utility', t => {
    const {rt, s} = setup();
    t.ok(s instanceof Sequencer);
    t.equal(s.runtime, rt);
    t.ok(s.util instanceof BlockUtility);
    t.equal(s.util.sequencer, s);
    t.end();
});

test('stepThread runs a script to the end', t => {
    const {s, ran, newThread} = setup(command('a', 'b'), command('b', 'c'), command('c'));
    const thread = newThread('a');
    s.stepThread(thread);
    t.strictSame(ran, ['a', 'b', 'c']);
    t.equal(thread.status, Thread.STATUS_DONE);
    t.end();
});

test('stepThread returns on a yield and resumes on the same block', t => {
    const {rt, s, ran, newThread} = setup(block('wait', 'test_wait', {next: 'after'}), command('after'));
    let waits = 0;
    rt._primitives.test_wait = (args, util) => {
        if (waits++ === 0) util.yield();
    };
    const thread = newThread('wait');

    s.stepThread(thread);
    t.equal(thread.status, Thread.STATUS_RUNNING);
    t.equal(thread.peekStack(), 'wait');
    t.strictSame(ran, []);

    s.stepThread(thread);
    t.strictSame(ran, ['after']);
    t.equal(thread.status, Thread.STATUS_DONE);
    t.end();
});

test('stepThread leaves a thread waiting on a promise', t => {
    const {rt, s, newThread} = setup(block('async', 'test_async'));
    rt._primitives.test_async = () => new Promise(() => {});
    const thread = newThread('async');
    s.stepThread(thread);
    t.equal(thread.status, Thread.STATUS_PROMISE_WAIT);
    t.equal(thread.peekStack(), 'async');
    t.end();
});

test('stepToBranch pushes the branch, or null when it is empty', t => {
    const {s, newThread} = setup(
        block('if', 'control_if_else', {inputs: {SUBSTACK: {name: 'SUBSTACK', block: 'inner', shadow: null}}}),
        command('inner', null, {parent: 'if', topLevel: false})
    );
    const thread = newThread('if');

    s.stepToBranch(thread, 1, false);
    t.equal(thread.peekStack(), 'inner');
    thread.popStack();

    s.stepToBranch(thread, 2, true);
    t.equal(thread.peekStack(), null);
    t.equal(thread.peekParentStackFrame().isLoop, true);
    t.end();
});

test('retireThread ends the thread and drops its frames', t => {
    const {s, newThread} = setup(command('a'));
    const thread = newThread('a');
    thread.pushStack('b');
    thread.requestScriptGlowInFrame = true;

    s.retireThread(thread);
    t.strictSame(thread.stack, []);
    t.strictSame(thread.stackFrames, []);
    t.equal(thread.peekStackFrame(), null);
    t.equal(thread.requestScriptGlowInFrame, false);
    t.equal(thread.status, Thread.STATUS_DONE);
    t.end();
});

const procedure = (proccode: string, warp: string) => [
    block('def', 'procedures_definition', {inputs: {custom_block: {name: 'custom_block', block: 'proto', shadow: 'proto'}}}),
    block('proto', 'procedures_prototype', {
        parent: 'def', topLevel: false, shadow: true, mutation: {tagName: 'mutation', children: [], proccode, warp}
    }),
    block('call', 'procedures_call', {mutation: {tagName: 'mutation', children: [], proccode}})
];

test('stepToProcedure pushes the definition, in warp mode when the procedure asks', t => {
    const {s, newThread} = setup(...procedure('go %s', 'true'));
    const thread = newThread('call');

    s.stepToProcedure(thread, 'unknown');
    t.equal(thread.peekStack(), 'call');

    s.stepToProcedure(thread, 'go %s');
    t.equal(thread.peekStack(), 'def');
    t.equal(thread.peekStackFrame().warpMode, true);
    t.equal(thread.status, Thread.STATUS_RUNNING);
    t.end();
});

test('stepToProcedure yields on a recursive call outside warp mode', t => {
    const {s, newThread} = setup(...procedure('go %s', 'false'));
    const thread = newThread('call');
    thread.pushStack('call');

    s.stepToProcedure(thread, 'go %s');
    t.equal(thread.peekStack(), 'def');
    t.equal(thread.peekStackFrame().warpMode, false);
    t.equal(thread.status, Thread.STATUS_YIELD);
    t.end();
});

test('stepThreads returns and removes the threads that finished', t => {
    const {rt, s, newThread} = setup(command('a'));
    t.strictSame(s.stepThreads(), []);

    const thread = newThread('a');
    t.strictSame(s.stepThreads(), [thread]);
    t.strictSame(rt.threads, []);
    t.equal(s.activeThread, null);
    t.end();
});

test('stepThreads holds a tick-yielding thread until the next call', t => {
    const {rt, s, ran, newThread} = setup(block('tick', 'test_tick', {next: 'after'}), command('after'));
    let ticks = 0;
    rt._primitives.test_tick = (args, util) => {
        if (ticks++ === 0) util.yieldTick();
    };
    const thread = newThread('tick');

    s.stepThreads();
    t.equal(thread.status, Thread.STATUS_YIELD_TICK);
    t.strictSame(ran, []);

    s.stepThreads();
    t.strictSame(ran, ['after']);
    t.end();
});
