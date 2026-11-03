jest.mock('../../../src/lib/sim/sim-worker-factory', () => ({
    createSimWorker: () => {
        throw new Error('not used in tests');
    }
}));
jest.mock('../../../src/components/sim-panel/sim-panel.jsx', () => {
    /* eslint-disable react/jsx-no-bind -- a stand-in panel: one button per control the tests press */
    const MockSimPanel = ({
        onRun, onReset, onDistanceChange, onPs2Change, onToggleMute, muted, usesOled, restarted, runError
    }) => (<div>
        <button
            type="button"
            onClick={onToggleMute}
        >{muted ? 'Unmute' : 'Mute'}</button>
        <span>{usesOled ? 'with display' : 'no display'}</span>
        <span>{restarted ? 'restarted' : 'live'}</span>
        <span>{runError || 'no run error'}</span>
        <button
            type="button"
            onClick={onReset}
        >{'Reset'}</button>
        <button
            type="button"
            onClick={onRun}
        >{'Run'}</button>
        <button
            type="button"
            onClick={() => onDistanceChange(30)}
        >{'Near'}</button>
        <button
            type="button"
            onMouseDown={() => onPs2Change('PSB_PAD_UP', true)}
            onMouseUp={() => onPs2Change('PSB_PAD_UP', false)}
        >{'Up'}</button>
    </div>);
    /* eslint-enable react/jsx-no-bind */
    return MockSimPanel;
});

import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import SimPanel from '../../../src/containers/sim-panel.jsx';
import {HUNG_MS, setWorkerFactory} from '../../../src/lib/sim/sim-client';
import {registerCodeFlush} from '../../../src/lib/code-flush';

class FakeWorker {
    constructor () {
        this.posted = [];
        this.onmessage = null;
    }
    postMessage (m) {
        this.posted.push(m);
    }
    terminate () {
        this.terminated = true;
    }
}

beforeEach(() => setWorkerFactory(() => new FakeWorker()));
afterEach(() => setWorkerFactory(null));

test('records the loaded program on Run and clears it when the panel unmounts', () => {
    const store = configureStore()({scratchGui: {code: {simCode: 'code-1', simDiagnostics: []}}});
    const {getByText, unmount} = render(<Provider store={store}><SimPanel /></Provider>);
    fireEvent.click(getByText('Run'));
    const loaded = store.getActions().filter(a => a.type === 'scratch-gui/code/SET_SIM_LOADED_CODE');
    expect(loaded.map(a => a.code)).toEqual(['code-1']);
    unmount();
    const after = store.getActions().filter(a => a.type === 'scratch-gui/code/SET_SIM_LOADED_CODE');
    expect(after.map(a => a.code)).toEqual(['code-1', null]);
});

test('drives the distance sensor and gamepad inputs, and keeps them across a reload', () => {
    let worker;
    setWorkerFactory(() => (worker = new FakeWorker()));
    const store = configureStore()({scratchGui: {code: {simCode: 'code-1', simDiagnostics: []}}});
    const {getByText} = render(<Provider store={store}><SimPanel /></Provider>);
    const inputs = () => worker.posted.filter(m => m.type === 'input' && m.key !== 'gpio3');

    fireEvent.click(getByText('Run'));
    expect(inputs()).toEqual([{type: 'input', key: 'ultrasonic', value: 100}]);

    worker.posted = [];
    fireEvent.click(getByText('Near'));
    fireEvent.mouseDown(getByText('Up'));
    expect(inputs()).toEqual([
        {type: 'input', key: 'ultrasonic', value: 30},
        {type: 'input', key: 'ps2:PSB_PAD_UP', value: 1}
    ]);

    // Reloading the program starts it with the controls as the learner left them.
    worker.posted = [];
    fireEvent.click(getByText('Reset'));
    expect(inputs()).toEqual([
        {type: 'input', key: 'ultrasonic', value: 30},
        {type: 'input', key: 'ps2:PSB_PAD_UP', value: 1}
    ]);

    fireEvent.mouseUp(getByText('Up'));
    expect(inputs().slice(-1)).toEqual([{type: 'input', key: 'ps2:PSB_PAD_UP', value: 0}]);
});

test('Run and Reset load the code an edit just produced, not the debounced older code', () => {
    let worker;
    setWorkerFactory(() => (worker = new FakeWorker()));
    // The store still holds the code from before the edit; the pending regeneration yields new code.
    const store = configureStore()({scratchGui: {code: {simCode: 'old', simDiagnostics: []}}});
    const unregister = registerCodeFlush(() => ({generatedCode: 'g', simCode: 'new', simDiagnostics: []}));
    try {
        const {getByText} = render(<Provider store={store}><SimPanel /></Provider>);
        fireEvent.click(getByText('Run'));
        expect(worker.posted.filter(m => m.type === 'load').map(m => m.code)).toEqual(['new']);
        fireEvent.click(getByText('Reset'));
        expect(worker.posted.filter(m => m.type === 'load').map(m => m.code)).toEqual(['new', 'new']);
    } finally {
        unregister();
    }
});

test('tells the panel the program uses a display when its code builds one', () => {
    const withOled = configureStore()({scratchGui: {code: {
        simCode: 'const oled = $.hw.Adafruit_SSD1306(128, 64);',
        simDiagnostics: []
    }}});
    const {getByText, unmount} = render(<Provider store={withOled}><SimPanel /></Provider>);
    expect(getByText('with display')).toBeTruthy();
    unmount();
    const without = configureStore()({scratchGui: {code: {simCode: 'code-1', simDiagnostics: []}}});
    const second = render(<Provider store={without}><SimPanel /></Provider>);
    expect(second.getByText('no display')).toBeTruthy();
});

test('after the worker hangs, Run loads the program again into a fresh worker', () => {
    jest.useFakeTimers();
    try {
        const workers = [];
        setWorkerFactory(() => {
            const w = new FakeWorker();
            workers.push(w);
            return w;
        });
        const store = configureStore()({scratchGui: {code: {simCode: 'code-1', simDiagnostics: []}}});
        const {getByText} = render(<Provider store={store}><SimPanel /></Provider>);
        fireEvent.click(getByText('Run'));
        expect(workers[0].posted.map(m => m.type)).toContain('load');

        // The worker never answers: it is stuck in a program that does not give control back.
        act(() => {
            jest.advanceTimersByTime(HUNG_MS + 1);
        });
        expect(workers[0].terminated).toBe(true);
        expect(getByText('restarted')).toBeTruthy();

        fireEvent.click(getByText('Run'));
        expect(workers[1].posted.filter(m => m.type === 'load').map(m => m.code)).toEqual(['code-1']);
        expect(workers[1].posted.slice(-1)).toEqual([{type: 'run'}]);
        expect(getByText('live')).toBeTruthy();
    } finally {
        jest.useRealTimers();
    }
});

test('a run error is passed on separately from the code problems', () => {
    let worker;
    setWorkerFactory(() => (worker = new FakeWorker()));
    const store = configureStore()({scratchGui: {code: {simCode: 'code-1', simDiagnostics: []}}});
    const {getByText} = render(<Provider store={store}><SimPanel /></Provider>);
    fireEvent.click(getByText('Run'));
    act(() => {
        worker.onmessage({data: {type: 'error', message: 'Unexpected token'}});
    });
    expect(getByText('Unexpected token')).toBeTruthy();
});

describe('the buzzer plays through the speakers', () => {
    let gain;
    let frequency;
    beforeEach(() => {
        gain = 0;
        frequency = 0;
        window.AudioContext = class {
            constructor () {
                this.currentTime = 0;
                this.state = 'running';
            }
            createGain () {
                return {gain: {setTargetAtTime: v => {
                    gain = v;
                }}, connect: () => {}};
            }
            createOscillator () {
                return {frequency: {setTargetAtTime: v => {
                    frequency = v;
                }}, connect: () => {}, start: () => {}};
            }
            close () {
                return Promise.resolve();
            }
        };
        window.localStorage.removeItem('thingblock.sim.muted');
    });
    afterEach(() => {
        delete window.AudioContext;
    });

    const buzzer = (running, duty, hz) => {
        const pwm = new Array(16).fill(0);
        pwm[14] = duty;
        return {type: 'snapshot', snapshot: {running, pwm, pwmHz: hz, serial: ''}};
    };

    test('a note sounds at its pitch, stops when the program pauses, and Mute silences it', () => {
        let worker;
        setWorkerFactory(() => (worker = new FakeWorker()));
        const store = configureStore()({scratchGui: {code: {simCode: 'code-1', simDiagnostics: []}}});
        const {getByText} = render(<Provider store={store}><SimPanel /></Provider>);
        fireEvent.click(getByText('Run'));
        act(() => worker.onmessage({data: buzzer(true, 2048, 523.25)}));
        expect(frequency).toBe(523.25);
        expect(gain).toBeGreaterThan(0);
        act(() => worker.onmessage({data: buzzer(false, 2048, 523.25)}));
        expect(gain).toBe(0);

        act(() => worker.onmessage({data: buzzer(true, 2048, 440)}));
        expect(gain).toBeGreaterThan(0);
        fireEvent.click(getByText('Mute'));
        expect(gain).toBe(0);
        expect(window.localStorage.getItem('thingblock.sim.muted')).toBe('1');
        act(() => worker.onmessage({data: buzzer(true, 2048, 660)}));
        expect(gain).toBe(0);
        expect(getByText('Unmute')).toBeTruthy();
    });
});
