/* eslint-env jest */
import reducer, {
    closeLesson, goToStep, lessonInitialState, markStepPassed, openLesson, setCheck, showNextHint
} from '../../../src/reducers/lesson';

const lesson = {ma: 'x', steps: [{rules: []}, {rules: [{kind: 'light'}]}, {rules: []}]};

test('opens at saved progress, or step 0', () => {
    expect(reducer(lessonInitialState, openLesson(lesson, {stepIndex: 1, passedSteps: [1]})))
        .toEqual({lesson, stepIndex: 1, passedSteps: [1], hintsShown: 0, check: {status: 'idle', messages: []}});
    expect(reducer(lessonInitialState, openLesson(lesson, null)))
        .toEqual({lesson, stepIndex: 0, passedSteps: [], hintsShown: 0, check: {status: 'idle', messages: []}});
});

test('changing step resets hints and the verdict; passing a step records it once', () => {
    let state = reducer(lessonInitialState, openLesson(lesson, null));
    state = reducer(state, showNextHint());
    expect(state.hintsShown).toBe(1);
    state = reducer(state, setCheck('failed', ['Đèn L1 chưa sáng.']));
    expect(state.check).toEqual({status: 'failed', messages: ['Đèn L1 chưa sáng.']});
    state = reducer(state, goToStep(1));
    expect(state)
        .toEqual({lesson, stepIndex: 1, passedSteps: [], hintsShown: 0, check: {status: 'idle', messages: []}});
    state = reducer(state, markStepPassed(1));
    state = reducer(state, markStepPassed(1));
    expect(state.passedSteps).toEqual([1]);
});

test('close returns to the initial state', () => {
    const state = reducer(reducer(lessonInitialState, openLesson(lesson, {stepIndex: 2, passedSteps: [0]})), closeLesson());
    expect(state).toEqual(lessonInitialState);
    expect(state.lesson).toBeNull();
});
