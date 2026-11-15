jest.mock('../../../src/lib/sim/sim-worker-factory', () => ({
    createSimWorker: () => {
        throw new Error('not used in tests');
    }
}));

import React from 'react';
import {EventEmitter} from 'events';
import '@testing-library/jest-dom';
import {act} from '@testing-library/react';
import {Provider, useSelector} from 'react-redux';
import {combineReducers, createStore} from 'redux';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import LessonPanel from '../../../src/containers/lesson-panel.jsx';
import {setWorkerFactory} from '../../../src/lib/sim/sim-client';
import codeReducer, {setSimCode} from '../../../src/reducers/code';
import lessonReducer, {openLesson} from '../../../src/reducers/lesson';

class FakeWorker {
    constructor () {
        this.posted = [];
        FakeWorker.last = this;
    }
    postMessage (m) {
        this.posted.push(m);
    }
}

const lesson = {
    ma: 'cam',
    ten: 'Camera AI',
    baseUrl: '/',
    steps: [
        {title: 'Chào', body: [], hints: [], rules: [], pointAt: null},
        {
            title: 'Ngôi sao',
            body: [],
            hints: [],
            pointAt: null,
            rules: [{kind: 'cameraOn'}, {kind: 'touch', name: 'sao', part: 'indexTip'}]
        }
    ]
};

const Host = () => (useSelector(state => state.scratchGui.lesson.lesson) ? <LessonPanel /> : null);
const hand = (x, y) => ({gesture: 'open', landmarks: Array.from({length: 21}, () => ({x, y}))});

const setup = () => {
    const vm = {events: new EventEmitter()};
    const store = createStore(combineReducers({
        scratchGui: combineReducers({lesson: lessonReducer, code: codeReducer, vm: (s = vm) => s})
    }));
    store.dispatch(setSimCode('', []));
    store.dispatch(openLesson(lesson, {stepIndex: 1, passedSteps: []}));
    const view = renderWithIntl(<Provider store={store}><Host /></Provider>);
    const lessonState = () => store.getState().scratchGui.lesson;
    const emit = (name, payload) => act(() => {
        vm.events.emit(name, payload);
    });
    const tick = ms => act(() => {
        jest.advanceTimersByTime(ms);
    });
    return {vm, store, view, lessonState, emit, tick};
};

beforeEach(() => {
    jest.useFakeTimers();
    setWorkerFactory(() => new FakeWorker());
});
afterEach(() => jest.useRealTimers());

test('a Camera AI step is not sent to the simulator, and waits for Run', () => {
    const {lessonState, tick} = setup();
    tick(300);
    expect(FakeWorker.last.posted).toContainEqual({type: 'watch', rules: null});
    expect(FakeWorker.last.posted.some(m => m.type === 'watch' && m.rules)).toBe(false);
    expect(lessonState().check.status).toBe('idle');
});

test('passes once the camera is on and the star sits on the index fingertip', () => {
    const {lessonState, emit, tick} = setup();
    emit('PROJECT_RUN_START');
    emit('CAMERA_AI_CAMERA_STATUS', {on: true, ready: true});
    emit('CAMERA_AI_PLAYGROUND_UPDATE', {objects: [{name: 'sao', x: 0, y: 0, size: 50}], scores: [0, 0], say: ''});
    tick(300);
    expect(lessonState().check.status).toBe('waiting');

    emit('CAMERA_AI_VISION_RESULTS', {hands: [hand(0.5, 0.5)], mirror: true, t: Date.now()});
    tick(300);
    expect(lessonState().check.status).toBe('passed');
    expect(lessonState().passedSteps).toEqual([1]);
});

test('names what is missing once the window after Run has passed', () => {
    const {lessonState, emit, tick} = setup();
    emit('PROJECT_RUN_START');
    tick(5000);
    expect(lessonState().check).toEqual({
        status: 'failed',
        messages: ['Camera chưa bật.', 'Sân chơi chưa có vật tên "sao".']
    });
});
