import React from 'react';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import {fireEvent, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import VM from '@scratch/scratch-vm';

import BoardMenu from '../../../src/components/menu-bar/board-menu.jsx';

describe('BoardMenu', () => {
    const vm = new VM();
    const selectedDevice = vm.getDeviceList()[0];

    const renderBoardMenu = (selectedDeviceId = selectedDevice.deviceId) => {
        const store = configureStore()({
            scratchGui: {
                board: {selectedDeviceId},
                vm
            }
        });

        return {
            store,
            ...render(
                <Provider store={store}>
                    <IntlProvider locale="en">
                        <BoardMenu />
                    </IntlProvider>
                </Provider>
            )
        };
    };

    test('renders "Select board" when no device is selected', () => {
        renderBoardMenu(null);
        expect(screen.getByRole('button', {name: 'Select board'})).toBeInTheDocument();
    });

    test('renders with the selected device name', () => {
        renderBoardMenu(selectedDevice.deviceId);

        expect(screen.getByRole('button', {
            name: `Board: ${selectedDevice.name}`
        })).toBeInTheDocument();
    });

    test('clicking opens the board library', () => {
        const {store} = renderBoardMenu(selectedDevice.deviceId);

        fireEvent.click(screen.getByRole('button', {
            name: `Board: ${selectedDevice.name}`
        }));

        expect(store.getActions()).toEqual([{
            type: 'scratch-gui/modals/OPEN_MODAL',
            modal: 'boardLibrary'
        }]);
    });

    afterEach(() => jest.restoreAllMocks());

    test('offers no firmware item when the board declares none', () => {
        jest.spyOn(vm, 'getDeviceFirmware').mockReturnValue([]);
        renderBoardMenu(selectedDevice.deviceId);

        fireEvent.click(screen.getByRole('button', {name: `Board: ${selectedDevice.name}`}));

        expect(screen.queryByText(/live mode/i)).not.toBeInTheDocument();
    });

    test('does not flash until the dialog is confirmed', () => {
        jest.spyOn(vm, 'getDeviceFirmware').mockReturnValue([
            {id: 'telemetrix-ble', name: 'Live mode (Telemetrix over BLE)'}
        ]);
        const flash = jest.spyOn(vm, 'flashDeviceFirmware').mockResolvedValue();
        renderBoardMenu(selectedDevice.deviceId);

        fireEvent.click(screen.getByRole('button', {name: `Board: ${selectedDevice.name}`}));
        fireEvent.click(screen.getByText('Live mode (Telemetrix over BLE)'));

        // Opening the dialog must not flash: this erases whatever the learner uploaded.
        expect(flash).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', {name: /flash|confirm/i}));

        expect(flash).toHaveBeenCalledTimes(1);
        expect(flash).toHaveBeenCalledWith(selectedDevice.deviceId, 'telemetrix-ble', expect.anything());
    });

    test('the confirm dialog warns that the board program is erased', () => {
        jest.spyOn(vm, 'getDeviceFirmware').mockReturnValue([
            {id: 'telemetrix-ble', name: 'Live mode (Telemetrix over BLE)'}
        ]);
        renderBoardMenu(selectedDevice.deviceId);

        fireEvent.click(screen.getByRole('button', {name: `Board: ${selectedDevice.name}`}));
        fireEvent.click(screen.getByText('Live mode (Telemetrix over BLE)'));

        expect(screen.getByText(/erase|replace/i)).toBeInTheDocument();
    });
});
