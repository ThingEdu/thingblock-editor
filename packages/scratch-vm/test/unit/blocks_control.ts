import {test} from 'tap';
import {EventEmitter} from 'events';
import Control from '../../src/blocks/scratch3_control.ts';
import BlockUtility from '../../src/engine/block-utility.ts';
import type {RuntimeEvents} from '../../src/engine/runtime/runtime-events.ts';

/** Primitives only touch the parts of `util` each test fills in. */
type Util = BlockUtility & Record<string, any>;
const mockUtil = (util: object) => util as Util;

const newControl = (requestRedraw = () => {}) => {
    const events = new EventEmitter<RuntimeEvents>();
    return {events, c: new Control(events, {requestRedraw})};
};

test('getPrimitives', t => {
    t.type(newControl().c.getPrimitives(), 'object');
    t.end();
});

test('repeat', t => {
    const {c} = newControl();
    let i = 0;
    const util = mockUtil({
        stackFrame: Object.create(null),
        startBranch: () => {
            i++;
            c.repeat({TIMES: 10}, util);
        }
    });

    c.repeat({TIMES: 10}, util);
    t.equal(util.stackFrame.loopCounter, -1);
    t.equal(i, 10);
    t.end();
});

test('repeat rounds with round()', t => {
    const {c} = newControl();
    const roundingTest = (inputForRepeat: number, expectedTimes: number) => {
        let i = 0;
        const util = mockUtil({
            stackFrame: Object.create(null),
            startBranch: () => {
                i++;
                c.repeat({TIMES: inputForRepeat}, util);
            }
        });
        c.repeat({TIMES: inputForRepeat}, util);
        t.equal(i, expectedTimes);
    };

    roundingTest(3.2, 3);
    roundingTest(3.7, 4);
    roundingTest(3.5, 4);
    t.end();
});

test('repeatUntil', t => {
    const {c} = newControl();
    let i = 0;
    const util = mockUtil({
        stackFrame: Object.create(null),
        startBranch: () => {
            i++;
            c.repeatUntil({CONDITION: i === 10}, util);
        }
    });

    c.repeatUntil({CONDITION: i === 10}, util);
    t.equal(i, 10);
    t.end();
});

test('repeatWhile', t => {
    const {c} = newControl();
    let i = 0;
    const util = mockUtil({
        stackFrame: Object.create(null),
        startBranch: () => {
            i++;
            c.repeatWhile({CONDITION: i !== 10}, util);
        }
    });

    c.repeatWhile({CONDITION: i !== 10}, util);
    t.equal(i, 10);
    t.end();
});

test('forEach', t => {
    const {c} = newControl();
    const VARIABLE = {id: 'var', name: 'var'};
    const forEach = (value: unknown) => {
        const variableValues: unknown[] = [];
        const variable = {value: 0};
        const util = mockUtil({
            stackFrame: Object.create(null),
            target: {lookupOrCreateVariable: () => variable},
            startBranch: () => {
                variableValues.push(variable.value);
                c.forEach({VARIABLE, VALUE: value}, util);
            }
        });
        c.forEach({VARIABLE, VALUE: value}, util);
        return variableValues;
    };

    t.same(forEach('5'), [1, 2, 3, 4, 5]);
    t.same(forEach(4), [1, 2, 3, 4]);
    t.end();
});

test('forever', t => {
    const {c} = newControl();
    let i = 0;
    c.forever({}, mockUtil({
        startBranch: (branchNum: number, isLoop: boolean) => {
            i++;
            t.equal(branchNum, 1);
            t.equal(isLoop, true);
        }
    }));
    t.equal(i, 1);
    t.end();
});

test('if / ifElse', t => {
    const {c} = newControl();
    let i = 0;
    const util = mockUtil({
        startBranch: (branchNum: number) => {
            i += branchNum;
        }
    });

    c.if({CONDITION: true}, util);
    t.equal(i, 1);
    c.if({CONDITION: false}, util);
    t.equal(i, 1);
    c.ifElse({CONDITION: true}, util);
    t.equal(i, 2);
    c.ifElse({CONDITION: false}, util);
    t.equal(i, 4);
    t.end();
});

test('stop', t => {
    const {c} = newControl();
    const state = {stopAll: 0, stopOtherTargetThreads: 0, stopThisScript: 0};
    const util = mockUtil({
        stopAll: () => state.stopAll++,
        stopOtherTargetThreads: () => state.stopOtherTargetThreads++,
        stopThisScript: () => state.stopThisScript++
    });

    c.stop({STOP_OPTION: 'all'}, util);
    c.stop({STOP_OPTION: 'other scripts in sprite'}, util);
    c.stop({STOP_OPTION: 'other scripts in stage'}, util);
    c.stop({STOP_OPTION: 'this script'}, util);
    t.strictSame(state, {stopAll: 1, stopOtherTargetThreads: 2, stopThisScript: 1});
    t.end();
});

test('counter, incrCounter, clearCounter', t => {
    const {c} = newControl();
    t.equal(c.getCounter(), 0);

    c.incrCounter();
    c.incrCounter();
    t.equal(c.getCounter(), 2);

    c.clearCounter();
    t.equal(c.getCounter(), 0);
    t.end();
});

test('disposing the runtime clears the counter', t => {
    const {c, events} = newControl();
    c.incrCounter();
    events.emit('RUNTIME_DISPOSED');
    t.equal(c.getCounter(), 0);
    t.end();
});

test('allAtOnce', t => {
    const {c} = newControl();
    let ran = false;
    c.allAtOnce({}, mockUtil({
        startBranch: () => {
            ran = true;
        }
    }));
    t.ok(ran);
    t.end();
});

test('print emits the text, with nothing as an empty string', t => {
    const {c, events} = newControl();
    const printed: string[] = [];
    events.on('PRINT_TO_MONITOR', text => printed.push(text));

    c.print({STRING: 42});
    c.print({STRING: null});
    t.strictSame(printed, ['42', '']);
    t.end();
});

test('wait', t => {
    let redraws = 0;
    const {c} = newControl(() => redraws++);
    const args = {DURATION: 0.01};
    const waitTime = args.DURATION * 1000;
    const startTest = Date.now();
    const thresholdSmall = 1000 / 60; // only allow the wait to end one 60Hz frame early
    const thresholdLarge = 1000 / 3; // be less picky about when the wait ends, in case CPU load slows the VM
    let yields = 0;
    const util = new BlockUtility();
    const waitUtil = mockUtil({
        stackFrame: {},
        yield: () => yields++,
        stackTimerNeedsInit: util.stackTimerNeedsInit,
        startStackTimer: util.startStackTimer,
        stackTimerFinished: util.stackTimerFinished
    });

    c.wait(args, waitUtil);
    t.equal(yields, 1, 'First wait block yielded');
    t.equal(redraws, 1, 'Starting the wait requests a redraw');

    // Spin the cpu until enough time passes
    let timeElapsed = 0;
    while (timeElapsed < waitTime) {
        timeElapsed = waitUtil.stackFrame.timer.timeElapsed();
        // In case util.timer is broken - have our own "exit"
        if (Date.now() - startTest > timeElapsed + thresholdSmall) {
            break;
        }
    }

    c.wait(args, waitUtil);
    t.equal(yields, 1, 'Second call after timeElapsed does not yield');
    t.equal(waitTime, waitUtil.stackFrame.duration);
    t.ok(timeElapsed >= (waitTime - thresholdSmall),
        `Wait block ended too early: ${timeElapsed} < ${waitTime} - ${thresholdSmall}`);
    t.ok(timeElapsed <= (waitTime + thresholdLarge),
        `Wait block ended too late: ${timeElapsed} > ${waitTime} + ${thresholdLarge}`);
    t.end();
});
