import {test} from 'tap';
import Thread from '../../src/engine/thread.ts';
import type Blocks from '../../src/engine/blocks';
import type Target from '../../src/engine/target';

const blocks: Record<string, {opcode: string, next: string | null, mutation?: {proccode: string}}> = {
    arbitraryString: {opcode: 'motion_movesteps', next: 'secondString'},
    secondString: {opcode: 'procedures_call', next: null, mutation: {proccode: 'fakeCode'}}
};

const container = {
    getBlock: (id: string) => blocks[id],
    getNextBlock: (id: string | null) => blocks[id]?.next ?? null
} as unknown as Blocks;

const newThread = () => new Thread('arbitraryString', {} as Target, container);

test('popStack', t => {
    const th = newThread();
    th.pushStack('arbitraryString');
    t.equal(th.popStack(), 'arbitraryString');
    t.equal(th.popStack(), undefined);
    t.end();
});

test('atStackTop', t => {
    const th = newThread();
    th.pushStack('arbitraryString');
    th.pushStack('secondString');
    t.equal(th.atStackTop(), false);
    th.popStack();
    t.equal(th.atStackTop(), true);
    t.end();
});

test('reuseStackForNextBlock', t => {
    const th = newThread();
    th.pushStack('arbitraryString');
    th.reuseStackForNextBlock('secondString');
    t.equal(th.popStack(), 'secondString');
    t.end();
});

test('peekStackFrame', t => {
    const th = newThread();
    th.pushStack('arbitraryString');
    t.equal(th.peekStackFrame()?.warpMode, false);
    th.popStack();
    t.equal(th.peekStackFrame(), null);
    t.end();
});

test('peekParentStackFrame', t => {
    const th = newThread();
    th.pushStack('arbitraryString');
    th.peekStackFrame()!.warpMode = true;
    t.equal(th.peekParentStackFrame(), null);
    th.pushStack('secondString');
    t.equal(th.peekParentStackFrame()?.warpMode, true);
    t.end();
});

test('pushStack inherits the parent frame warp mode', t => {
    const th = newThread();
    th.pushStack('arbitraryString');
    th.peekStackFrame()!.warpMode = true;
    th.pushStack('secondString');
    t.equal(th.peekStackFrame()?.warpMode, true);
    t.end();
});

test('pushReportedValue', t => {
    const th = newThread();
    th.pushStack('arbitraryString');
    th.pushStack('secondString');
    th.pushReportedValue('value');
    t.equal(th.justReported, 'value');
    th.pushReportedValue(undefined);
    t.equal(th.justReported, null);
    t.end();
});

test('peekStack', t => {
    const th = newThread();
    th.pushStack('arbitraryString');
    t.equal(th.peekStack(), 'arbitraryString');
    th.popStack();
    t.equal(th.peekStack(), null);
    t.end();
});

test('PushGetParam', t => {
    const th = newThread();
    th.pushStack('arbitraryString');
    th.initParams();
    th.pushParam('testParam', 'testValue');
    t.equal(th.peekStackFrame()?.params?.testParam, 'testValue');
    t.equal(th.getParam('testParam'), 'testValue');
    // Params outside of define stack always evaluate to null
    t.equal(th.getParam('nonExistentParam'), null);
    t.end();
});

test('params on an empty stack throw', t => {
    const th = newThread();
    t.throws(() => th.initParams(), /initParams: empty stack on thread arbitraryString/);
    t.throws(() => th.pushParam('testParam', 'testValue'), /pushParam: empty stack/);
    t.end();
});

test('goToNextBlock', t => {
    const th = newThread();
    t.equal(th.peekStack(), null);
    th.pushStack('secondString');
    t.equal(th.peekStack(), 'secondString');
    th.goToNextBlock();
    t.equal(th.peekStack(), null);
    th.pushStack('secondString');
    th.pushStack('arbitraryString');
    t.equal(th.peekStack(), 'arbitraryString');
    th.goToNextBlock();
    t.equal(th.peekStack(), 'secondString');
    th.goToNextBlock();
    t.equal(th.peekStack(), null);
    t.end();
});

test('stopThisScript', t => {
    const th = newThread();
    th.stopThisScript();
    t.equal(th.peekStack(), null);
    t.equal(th.status, Thread.STATUS_DONE);

    const inProcedure = newThread();
    inProcedure.pushStack('arbitraryString');
    inProcedure.stopThisScript();
    t.equal(inProcedure.peekStack(), null);
    inProcedure.pushStack('arbitraryString');
    inProcedure.pushStack('secondString');
    inProcedure.stopThisScript();
    t.equal(inProcedure.peekStack(), 'secondString');
    t.end();
});

test('isRecursiveCall', t => {
    const th = newThread();
    t.equal(th.isRecursiveCall('fakeCode'), false);
    th.pushStack('secondString');
    t.equal(th.isRecursiveCall('fakeCode'), false);
    th.pushStack('arbitraryString');
    t.equal(th.isRecursiveCall('fakeCode'), true);
    th.pushStack('arbitraryString');
    t.equal(th.isRecursiveCall('fakeCode'), true);
    th.popStack();
    t.equal(th.isRecursiveCall('fakeCode'), true);
    th.popStack();
    t.equal(th.isRecursiveCall('fakeCode'), false);
    th.popStack();
    t.equal(th.isRecursiveCall('fakeCode'), false);
    t.end();
});

test('isRecursiveCall skips blocks missing from the container', t => {
    // A procedure call clicked in the flyout sits at the stack bottom but lives in the flyout's blocks.
    const th = newThread();
    th.pushStack('flyoutCall');
    th.pushStack('arbitraryString');
    t.equal(th.isRecursiveCall('fakeCode'), false);
    th.reuseStackForNextBlock('secondString');
    th.pushStack('arbitraryString');
    t.equal(th.isRecursiveCall('fakeCode'), true);
    t.end();
});
