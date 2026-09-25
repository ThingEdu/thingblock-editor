import {test} from 'tap';
import {EventEmitter} from 'events';
import Blocks from '../../src/engine/blocks.ts';
import Thread from '../../src/engine/thread.ts';
import type RuntimeType from '../../src/engine/runtime.ts';
import type Sequencer from '../../src/engine/sequencer';
import type Target from '../../src/engine/target';
import type {Block} from '../../src/engine/block-types.ts';
import type {RuntimeEvents} from '../../src/engine/runtime/runtime-events.ts';

const keyHat = (id: string, key: string, next: string | null = null) => ({
    id,
    opcode: 'event_whenkeypressed',
    fields: {KEY_OPTION: {name: 'KEY_OPTION', value: key}},
    inputs: {},
    next,
    parent: null,
    shadow: false,
    topLevel: true
});

const flagHat = (id: string) => ({...keyHat(id, ''), opcode: 'event_whenflagclicked', fields: {}});

const newTarget = (...blocks: object[]) => {
    const container = new Blocks(new EventEmitter<RuntimeEvents>());
    blocks.forEach(block => container.createBlock(block as Block));
    return {blocks: container} as unknown as Target;
};

/** A Runtime whose `execute` only records the threads it runs. */
const setup = (t: tap.Test, ...targets: Target[]) => {
    const executed: Thread[] = [];
    const Runtime: typeof RuntimeType = t.mockRequire('../../src/engine/runtime.ts', {
        '../../src/engine/execute.ts': (_sequencer: Sequencer, thread: Thread) => executed.push(thread)
    }).default;
    const rt = new Runtime();
    rt.executableTargets = targets;
    return {rt, executed};
};

test('unknown hat starts nothing', t => {
    const {rt} = setup(t, newTarget(keyHat('hat', 'space')));
    t.strictSame(rt.startHats('event_unknown'), []);
    t.end();
});

test('matches fields case-insensitively without changing them', t => {
    const {rt} = setup(t, newTarget(keyHat('space', 'space'), keyHat('a', 'a')));
    const fields = {KEY_OPTION: 'Space'};
    const threads = rt.startHats('event_whenkeypressed', fields);
    t.strictSame(threads.map(thread => thread.topBlock), ['space']);
    t.strictSame(fields, {KEY_OPTION: 'Space'});
    t.end();
});

test('runs each new thread past its hat', t => {
    const {rt, executed} = setup(t, newTarget(keyHat('hat', 'space', 'body'), {...keyHat('body', ''), topLevel: false}));
    const [thread] = rt.startHats('event_whenkeypressed', {KEY_OPTION: 'space'});
    t.strictSame(executed, [thread]);
    t.equal(thread.peekStack(), 'body');
    t.strictSame(rt.threads, [thread]);
    t.end();
});

test('skips a script that is still running unless the hat restarts', t => {
    const {rt} = setup(t, newTarget(keyHat('hat', 'space')));
    const [first] = rt.startHats('event_whenkeypressed', {KEY_OPTION: 'space'});
    t.strictSame(rt.startHats('event_whenkeypressed', {KEY_OPTION: 'space'}), []);

    first.status = Thread.STATUS_DONE;
    t.equal(rt.startHats('event_whenkeypressed', {KEY_OPTION: 'space'}).length, 1);
    t.end();
});

test('restarting hats replace the thread in its slot', t => {
    const {rt} = setup(t, newTarget(flagHat('flag'), keyHat('hat', 'space')));
    rt.startHats('event_whenkeypressed', {KEY_OPTION: 'space'});
    const [first] = rt.startHats('event_whenflagclicked');
    t.equal(rt.threads.indexOf(first), 1);

    const [restarted] = rt.startHats('event_whenflagclicked');
    t.not(restarted, first);
    t.equal(rt.threads.indexOf(restarted), 1);
    t.equal(rt.threads.length, 2);
    t.end();
});

test('stack-click threads coexist with hat threads', t => {
    const target = newTarget(keyHat('hat', 'space'));
    const {rt} = setup(t, target);
    const clicked = new Thread('hat', target, target.blocks);
    clicked.stackClick = true;
    rt.threads.push(clicked);

    t.equal(rt.startHats('event_whenkeypressed', {KEY_OPTION: 'space'}).length, 1);
    t.equal(rt.threads.length, 2);
    t.end();
});

test('optTarget restricts hats to one target', t => {
    const first = newTarget(keyHat('first', 'space'));
    const second = newTarget(keyHat('second', 'space'));
    const {rt} = setup(t, first, second);
    const threads = rt.startHats('event_whenkeypressed', {KEY_OPTION: 'space'}, second);
    t.strictSame(threads.map(thread => thread.topBlock), ['second']);
    t.end();
});

test('scripts start in execution order', t => {
    // executableTargets is stored in reverse execution order.
    const {rt} = setup(t, newTarget(keyHat('runsLast', 'space')), newTarget(keyHat('runsFirst', 'space')));
    const threads = rt.startHats('event_whenkeypressed', {KEY_OPTION: 'space'});
    t.strictSame(threads.map(thread => thread.topBlock), ['runsFirst', 'runsLast']);
    t.end();
});

test('edge-activated hats', t => {
    const {rt} = setup(t);
    rt._hats.sensing_edge = {edgeActivated: true};
    t.equal(rt.getIsHat('sensing_edge'), true);
    t.equal(rt.getIsEdgeActivatedHat('sensing_edge'), true);
    t.equal(rt.getIsEdgeActivatedHat('event_whenkeypressed'), false);
    t.equal(rt.getIsEdgeActivatedHat('event_unknown'), false);
    t.end();
});
