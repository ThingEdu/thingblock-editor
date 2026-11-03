/* eslint-env jest */
import {CHECK_WINDOW_US, decideCheck} from '../../../src/lib/lesson-check';

const ok = {ok: true, message: ''};
const no = {ok: false, message: 'Đèn L1 chưa sáng.'};
const base = {snapshot: {phase: 'loop', t: 0}, diagnostics: [], ranSinceEdit: true};

test('waits until the program has run since the last edit', () => {
    expect(decideCheck({...base, ranSinceEdit: false, report: {results: [ok], t: 0}}))
        .toEqual({status: 'waiting', messages: []});
    expect(decideCheck({...base, report: null})).toEqual({status: 'waiting', messages: []});
});

test('passes as soon as every rule holds, even early in the window', () => {
    expect(decideCheck({...base, report: {results: [ok, ok], t: 20000}})).toEqual({status: 'passed', messages: []});
});

test('keeps waiting on a miss until the window closes or the program halts', () => {
    expect(decideCheck({...base, report: {results: [no], t: 100000}})).toEqual({status: 'waiting', messages: []});
    expect(decideCheck({...base, report: {results: [no], t: CHECK_WINDOW_US}}))
        .toEqual({status: 'failed', messages: ['Đèn L1 chưa sáng.']});
    expect(decideCheck({...base, snapshot: {phase: 'halted', t: 1000}, report: {results: [no], t: 1000}}).status)
        .toBe('failed');
});

test('closes the window on the latest snapshot time, not the time the verdict last changed', () => {
    const report = {results: [no], t: 0};
    expect(decideCheck({...base, snapshot: {phase: 'loop', t: CHECK_WINDOW_US}, report}))
        .toEqual({status: 'failed', messages: ['Đèn L1 chưa sáng.']});
    expect(decideCheck({...base, snapshot: {phase: 'loop', t: 100000}, report}))
        .toEqual({status: 'waiting', messages: []});
});

test('a block with no simulation blocks grading rather than failing it', () => {
    expect(decideCheck({...base, diagnostics: [{message: 'Sim generator does not know rgb_strip'}], report: null}))
        .toEqual({status: 'blocked', messages: ['Sim generator does not know rgb_strip']});
});

test('a halted-with-error program reports the error', () => {
    expect(decideCheck({
        ...base, snapshot: {phase: 'halted', t: 10, error: 'division by zero'}, report: {results: [no], t: 10}
    })).toEqual({status: 'error', messages: ['division by zero']});
});

test('unsimulated blocks take precedence over a runtime error', () => {
    expect(decideCheck({
        ...base,
        diagnostics: [{message: 'Sim generator does not know rgb_strip'}],
        snapshot: {phase: 'halted', error: 'division by zero'},
        report: null
    })).toEqual({status: 'blocked', messages: ['Sim generator does not know rgb_strip']});
});

test('a step with no rules is never graded', () => {
    expect(decideCheck({...base, report: {results: [], t: 0, phase: 'loop'}}))
        .toEqual({status: 'idle', messages: []});
});
