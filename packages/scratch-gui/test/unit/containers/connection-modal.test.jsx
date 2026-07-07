import React from 'react';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import {render} from '@testing-library/react';

// Capture the props handed to the presentational component so we can assert how
// the container resolves the connection flow (list vs. native chooser).
let lastProps = null;
jest.mock('../../../src/components/connection-modal/connection-modal.jsx', () => {
    const PHASES = {scanning: 'scanning', connecting: 'connecting', connected: 'connected'};
    const Mock = props => {
        lastProps = props;
        return null;
    };
    Mock.PHASES = PHASES;
    return {__esModule: true, default: Mock, PHASES};
});

import VM from '@scratch/scratch-vm';
import ConnectionModal from '../../../src/containers/connection-modal.jsx';

describe('ConnectionModal container', () => {
    const mockStore = configureStore();
    let store;
    let vm;
    const originalBluetooth = Object.getOwnPropertyDescriptor(navigator, 'bluetooth');

    beforeEach(() => {
        lastProps = null;
        store = mockStore({
            scratchGui: {
                connectionModal: {extensionId: 'thingbotTelemetrix'}
            }
        });
        // Real VM prototype (satisfies the container's instanceOf prop type) without
        // running the heavy constructor; only the methods the container calls are stubbed.
        vm = Object.create(VM.prototype);
        vm.getPeripheralIsConnected = () => false;
        vm.on = () => {};
        vm.removeListener = () => {};
    });

    afterEach(() => {
        if (originalBluetooth) {
            Object.defineProperty(navigator, 'bluetooth', originalBluetooth);
        } else {
            delete navigator.bluetooth;
        }
    });

    const renderModal = () => render(
        <Provider store={store}>
            <ConnectionModal vm={vm} />
        </Provider>
    );

    test('Web Bluetooth present forces the external list (native chooser) flow', () => {
        Object.defineProperty(navigator, 'bluetooth', {value: {}, configurable: true});
        renderModal();
        expect(lastProps.useExternalPeripheralList).toBe(true);
    });

    test('Without Web Bluetooth, the in-app scanning list is used', () => {
        delete navigator.bluetooth;
        renderModal();
        expect(lastProps.useExternalPeripheralList).toBe(false);
    });
});
