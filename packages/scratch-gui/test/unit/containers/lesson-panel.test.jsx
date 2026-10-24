jest.mock('../../../src/lib/sim/sim-worker-factory', () => ({
    createSimWorker: () => {
        throw new Error('not used in tests');
    }
}));

import React from 'react';
import '@testing-library/jest-dom';
import {act, fireEvent} from '@testing-library/react';
import {Provider, useSelector} from 'react-redux';
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import LessonPanel from '../../../src/containers/lesson-panel.jsx';
import {setWorkerFactory} from '../../../src/lib/sim/sim-client';
import codeReducer, {setSimCode, setSimLoadedCode} from '../../../src/reducers/code';
import lessonReducer, {openLesson} from '../../../src/reducers/lesson';

class FakeWorker {
    constructor () {
        this.posted = [];
        this.onmessage = null;
        FakeWorker.last = this;
    }
    postMessage (m) {
        this.posted.push(m);
    }
}

const RULES = [{kind: 'light', target: 'L1', on: true}];
const lesson = {ma: 'den',
    ten: 'Đèn',
    baseUrl: '/',
    steps: [
        {title: 'A', body: [], hints: [], rules: [], pointAt: null},
        {title: 'B', body: [], hints: [], rules: RULES, pointAt: null}
    ]};

// Mirrors gui.jsx: the panel is mounted only while a lesson is open.
const Host = () => (useSelector(state => state.scratchGui.lesson.lesson) ? <LessonPanel /> : null);

// `loaded` is the program the Simulator panel last loaded into the worker (null: none).
const setup = (progress, loaded = 'code-1') => {
    const actions = [];
    const record = () => next => action => {
        actions.push(action);
        return next(action);
    };
    const store = createStore(
        combineReducers({scratchGui: combineReducers({lesson: lessonReducer, code: codeReducer})}),
        applyMiddleware(record)
    );
    store.dispatch(setSimCode('code-1', []));
    store.dispatch(setSimLoadedCode(loaded));
    store.dispatch(openLesson(lesson, progress));
    actions.length = 0;
    const view = renderWithIntl(
        <Provider store={store}>
            <Host />
        </Provider>
    );
    const lessonState = () => store.getState().scratchGui.lesson;
    const send = data => act(() => FakeWorker.last.onmessage({data}));
    return {store, actions, lessonState, send, ...view};
};

const report = (send, ok) => {
    send({type: 'snapshot', snapshot: {t: 6000000, phase: 'loop', running: true}});
    send({type: 'check', results: [{ok, message: ok ? '' : 'Đèn L1 chưa sáng.'}], t: 6000000, phase: 'loop'});
};

beforeEach(() => {
    window.localStorage.clear();
    setWorkerFactory(() => new FakeWorker());
});
afterEach(() => setWorkerFactory(null));

test('watches the current step rules, nothing on an ungraded step, and unwatches on unmount', () => {
    const {store, unmount} = setup({stepIndex: 1, passedSteps: []});
    expect(FakeWorker.last.posted).toEqual([{type: 'watch', rules: RULES}]);
    act(() => store.dispatch({type: 'scratch-gui/lesson/GO_TO_STEP', stepIndex: 0}));
    expect(FakeWorker.last.posted[FakeWorker.last.posted.length - 1]).toEqual({type: 'watch', rules: null});
    FakeWorker.last.posted = [];
    unmount();
    expect(FakeWorker.last.posted).toEqual([{type: 'watch', rules: null}]);
});

test('a passing report on the loaded program marks the step passed once and saves progress', () => {
    const {actions, lessonState, send, container} = setup({stepIndex: 1, passedSteps: []});
    report(send, true);
    expect(lessonState().check.status).toBe('passed');
    expect(lessonState().passedSteps).toEqual([1]);
    send({type: 'snapshot', snapshot: {t: 7000000, phase: 'loop', running: true}});
    expect(actions.filter(a => a.type === 'scratch-gui/lesson/MARK_PASSED')).toHaveLength(1);
    expect(container.querySelector('[data-check-status]')).toHaveAttribute('data-check-status', 'passed');
    expect(JSON.parse(window.localStorage.getItem('thingblock.lesson.den')))
        .toEqual({stepIndex: 1, passedSteps: [1]});
});

test('a failing report after the window shows its messages', () => {
    const {lessonState, send, container} = setup({stepIndex: 1, passedSteps: []});
    report(send, false);
    expect(lessonState().check).toEqual({status: 'failed', messages: ['Đèn L1 chưa sáng.']});
    expect(container.querySelector('[data-check-status]')).toHaveTextContent('Đèn L1 chưa sáng.');
});

test('with no program loaded, worker messages do not grade the step', () => {
    const {lessonState, send} = setup({stepIndex: 1, passedSteps: []}, null);
    report(send, true);
    expect(lessonState().check.status).toBe('idle');
    expect(lessonState().passedSteps).toEqual([]);
});

test('Back then Next with the program still loaded grades the step from the fresh report', () => {
    const {getByRole, lessonState, send} = setup({stepIndex: 1, passedSteps: []});
    fireEvent.click(getByRole('button', {name: /Back/}));
    fireEvent.click(getByRole('button', {name: /Next/}));
    expect(FakeWorker.last.posted[FakeWorker.last.posted.length - 1]).toEqual({type: 'watch', rules: RULES});
    send({type: 'check', results: [{ok: true, message: ''}], t: 6000000, phase: 'loop'});
    expect(lessonState().check.status).toBe('passed');
});

// Review Focus 5: an edit after a pass resets the verdict box but keeps the recorded pass.
test('editing blocks after a pass returns the verdict to idle and keeps the step passed', () => {
    const {store, actions, lessonState, send, container} = setup({stepIndex: 1, passedSteps: []});
    report(send, true);
    expect(lessonState().check.status).toBe('passed');
    actions.length = 0;
    act(() => store.dispatch(setSimCode('code-2', [])));
    // The paused old program keeps ticking until the next Run loads the edited one.
    send({type: 'snapshot', snapshot: {t: 6100000, phase: 'loop', running: false}});
    expect(lessonState().check.status).toBe('idle');
    expect(container.querySelector('[data-check-status]')).toHaveTextContent('Press Run to check');
    expect(lessonState().passedSteps).toEqual([1]);
    expect(actions.map(a => a.type)).not.toContain('scratch-gui/lesson/MARK_PASSED');
    expect(JSON.parse(window.localStorage.getItem('thingblock.lesson.den')).passedSteps).toEqual([1]);

    act(() => store.dispatch(setSimLoadedCode('code-2')));
    report(send, false);
    expect(lessonState().check.status).toBe('failed');
});

test('a block the simulator cannot run shows the blocked verdict without a run', () => {
    const {store, lessonState, container} = setup({stepIndex: 1, passedSteps: []});
    act(() => store.dispatch(setSimCode('x', [{blockId: 'b1', message: 'Sim generator does not know foo'}])));
    expect(lessonState().check).toEqual({status: 'blocked', messages: ['Sim generator does not know foo']});
    const box = container.querySelector('[data-check-status]');
    expect(box).toHaveAttribute('data-check-status', 'blocked');
    expect(box).toHaveTextContent('Sim generator does not know foo');
});

test('Next and Back move between steps and save the step', () => {
    const {getByRole, lessonState} = setup({stepIndex: 0, passedSteps: []});
    fireEvent.click(getByRole('button', {name: /Next/}));
    expect(lessonState().stepIndex).toBe(1);
    expect(JSON.parse(window.localStorage.getItem('thingblock.lesson.den')).stepIndex).toBe(1);
    fireEvent.click(getByRole('button', {name: /Back/}));
    expect(lessonState().stepIndex).toBe(0);
});

test('closing the panel closes the lesson and unwatches', () => {
    const {container, getByText, lessonState} = setup({stepIndex: 1, passedSteps: []});
    fireEvent.click(getByText('✕'));
    expect(lessonState().lesson).toBeNull();
    expect(container).toBeEmptyDOMElement();
    expect(FakeWorker.last.posted[FakeWorker.last.posted.length - 1]).toEqual({type: 'watch', rules: null});
});
