import '@testing-library/jest-dom';
import React from 'react';
import {Provider} from 'react-redux';
import {createStore} from 'redux';
import {IntlProvider} from 'react-intl';
import {render, screen} from '@testing-library/react';

import GUI from '../../../src/components/gui/gui.jsx';

const stub = name => {
    const Stub = () => <div data-testid={name} />;
    Stub.displayName = name;
    return Stub;
};
jest.mock('../../../src/containers/blocks.jsx', () => stub('blocks'));
jest.mock('../../../src/containers/sim-panel.jsx', () => stub('sim-panel'));
jest.mock('../../../src/containers/lesson-panel.jsx', () => stub('lesson-panel'));
jest.mock('../../../src/containers/lesson-library.jsx', () => stub('lesson-library'));
jest.mock('../../../src/containers/device-controls.jsx', () => stub('device-controls'));
jest.mock('../../../src/containers/platform-install-modal.jsx', () => stub('platform-install-modal'));
jest.mock('../../../src/containers/board-library.jsx', () => stub('board-library'));
jest.mock('../../../src/containers/peripheral-library.jsx', () => stub('peripheral-library'));
jest.mock('../../../src/containers/drag-layer.jsx', () => stub('drag-layer'));
jest.mock('../../../src/components/menu-bar/menu-bar.jsx', () => stub('menu-bar'));
jest.mock('../../../src/components/code-view/code-view.jsx', () => stub('code-view'));
jest.mock('../../../src/components/serial-log/serial-log.jsx', () => stub('serial-log'));

const vm = {
    runtime: {events: {on: () => {}, off: () => {}}},
    setMonitorBaud: () => {}
};

const store = createStore(() => ({
    scratchGui: {
        timeTravel: {year: 'NOW'},
        stageSize: {stageSize: 'large'},
        settings: {colorMode: 'default', theme: 'classic'}
    }
}));

const ui = lessonOpen => (
    <IntlProvider locale="en">
        <Provider store={store}>
            <GUI
                lessonOpen={lessonOpen}
                selectedDeviceId="thingbot"
                vm={vm}
            />
        </Provider>
    </IntlProvider>
);

describe('GUI with a lesson open', () => {
    test('the extension button sits in the workspace area, not over the lesson column', () => {
        render(ui(true));
        const workspaceArea = screen.getByTestId('blocks').parentElement;
        expect(workspaceArea).not.toContainElement(screen.getByTestId('lesson-panel'));
        expect(workspaceArea).toContainElement(screen.getByRole('button', {name: 'Add Peripheral'}));
    });

});
