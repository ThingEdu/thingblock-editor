jest.mock('../../../src/lib/sim/sim-worker-factory', () => ({
    createSimWorker: () => {
        throw new Error('not used in tests');
    }
}));
jest.mock('../../../src/components/sim-panel/sim-panel.jsx', () => {
    const MockSimPanel = ({onRun}) => (<button
        type="button"
        onClick={onRun}
    >{'Run'}</button>);
    return MockSimPanel;
});

import React from 'react';
import {fireEvent, render} from '@testing-library/react';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import SimPanel from '../../../src/containers/sim-panel.jsx';
import {setWorkerFactory} from '../../../src/lib/sim/sim-client';

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
