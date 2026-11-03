jest.mock('../../../src/lib/sim/sim-worker-factory', () => ({
    createSimWorker: () => {
        throw new Error('not used in tests');
    }
}));
jest.mock('../../../src/components/sim-panel/sim-panel.jsx', () => {
    /* eslint-disable react/jsx-no-bind -- a stand-in panel: one button per control the tests press */
    const MockSimPanel = ({onRun, onReset, onDistanceChange, onPs2Change}) => (<div>
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
import {fireEvent, render} from '@testing-library/react';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import SimPanel from '../../../src/containers/sim-panel.jsx';
import {setWorkerFactory} from '../../../src/lib/sim/sim-client';
import {registerCodeFlush} from '../../../src/lib/code-flush';

class FakeWorker {
    constructor () {
        this.posted = [];
        this.onmessage = null;
    }
    postMessage (m) {
        this.posted.push(m);
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
