import React from 'react';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import {fireEvent, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import VM from '@thingblock/thingblock-vm';

import BoardMenu from '../../../src/components/menu-bar/board-menu.jsx';

describe('BoardMenu', () => {
    const vm = new VM();
    // The built-in boards are all hidden from the picker since 0.6; the menu still names a
    // hidden board a project was saved on.
    const selectedDevice = vm.devices.getDeviceList({includeHidden: true})[0];

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
});
