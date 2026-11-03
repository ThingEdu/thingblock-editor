import React from 'react';
import configureStore from 'redux-mock-store';
import MenuBarHOC from '../../../src/containers/menu-bar-hoc.jsx';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';

// TODO rewrite this test to use react-testing-library

describe('Menu Bar HOC', () => {
    const mockStore = configureStore();
    let store;
    // The container reads projectChanged from the store, so tests of an unchanged project need one.
    let unchangedStore;
    let Component;
    // The wrapped component's confirmReadyToReplaceProject: it answers with a Promise, because in the
    // desktop app the question is a native dialog.
    let confirmReadyToReplaceProject;

    beforeEach(() => {
        store = mockStore({
            scratchGui: {
                projectChanged: true,
                thingbotTelemetrix: {loaded: false, connected: false, connecting: false},
                // The container listens for the ThingBot extension's connection events.
                vm: {
                    events: {addListener: () => {}, removeListener: () => {}},
                    extensionManager: {isExtensionLoaded: () => false}
                }
            }
        });

        const state = store.getState();
        unchangedStore = mockStore({scratchGui: {...state.scratchGui, projectChanged: false}});

        Component = jest.fn(
            props => {
                confirmReadyToReplaceProject = props.confirmReadyToReplaceProject;
                return (<>
                    <div id="shouldSaveBeforeTransition">
                        {`${props.shouldSaveBeforeTransition()}`}
                    </div>
                </>);
            }
        );
    });

    test('Logged in user who IS owner and HAS changed project will NOT be prompted to save', async () => {
        const WrappedComponent = MenuBarHOC(Component);
        render(
            <WrappedComponent
                canCreateNew
                canSave
                projectChanged
                // assume the user will click "cancel" on the confirm dialog
                confirmWithMessage={() => (false)} // eslint-disable-line react/jsx-no-bind
                store={store}
            />
        );

        await expect(confirmReadyToReplaceProject('Replace?')).resolves.toBe(true);
    });

    test('Logged in user who IS owner and has NOT changed project will NOT be prompted to save', async () => {
        const WrappedComponent = MenuBarHOC(Component);
        render(
            <WrappedComponent
                canCreateNew
                canSave
                confirmWithMessage={() => (false)} // eslint-disable-line react/jsx-no-bind
                projectChanged={false}
                store={unchangedStore}
            />
        );

        await expect(confirmReadyToReplaceProject('Replace?')).resolves.toBe(true);
    });

    test('Logged in user who is NOT owner and HAS changed project will NOT be prompted to save', async () => {
        const WrappedComponent = MenuBarHOC(Component);
        render(
            <WrappedComponent
                canCreateNew
                projectChanged
                canSave={false}
                confirmWithMessage={() => (false)} // eslint-disable-line react/jsx-no-bind
                store={store}
            />
        );

        await expect(confirmReadyToReplaceProject('Replace?')).resolves.toBe(true);
    });

    test('Logged OUT user who HAS changed project WILL be prompted to save', async () => {
        const WrappedComponent = MenuBarHOC(Component);
        render(
            <WrappedComponent
                projectChanged
                canCreateNew={false}
                canSave={false}
                confirmWithMessage={() => (false)} // eslint-disable-line react/jsx-no-bind
                store={store}
            />
        );

        await expect(confirmReadyToReplaceProject('Replace?')).resolves.toBe(false);
    });

    test('Logged OUT user who has NOT changed project WILL NOT be prompted to save', async () => {
        const WrappedComponent = MenuBarHOC(Component);
        render(
            <WrappedComponent
                canCreateNew={false}
                canSave={false}
                confirmWithMessage={() => (false)} // eslint-disable-line react/jsx-no-bind
                projectChanged={false}
                store={unchangedStore}
            />
        );

        await expect(confirmReadyToReplaceProject('Replace?')).resolves.toBe(true);
    });

    test('Logged in user who IS owner and HAS changed project SHOULD save before transition to project page', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                canSave
                projectChanged
                store={store}
            />
        );

        const element = container.querySelector('#shouldSaveBeforeTransition');
        expect(element).toHaveTextContent(/true/i);
    });

    test('Logged in user who IS owner and has NOT changed project should NOT save before transition', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                canSave
                projectChanged={false}
                store={unchangedStore}
            />
        );

        const element = container.querySelector('#shouldSaveBeforeTransition');
        expect(element).toHaveTextContent(/false/i);
    });

    test('Logged in user who is NOT owner and HAS changed project should NOT save before transition', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                projectChanged
                canSave={false}
                store={store}
            />
        );

        const element = container.querySelector('#shouldSaveBeforeTransition');
        expect(element).toHaveTextContent(/false/i);
    });

    test('Logged in user who is NOT owner and has NOT changed project should NOT save before transition', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                canSave={false}
                projectChanged={false}
                store={unchangedStore}
            />
        );

        const element = container.querySelector('#shouldSaveBeforeTransition');
        expect(element).toHaveTextContent(/false/i);
    });

});

test('the default question passes the message and button labels to the desktop-aware dialog', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    try {
        const mockStore = configureStore();
        const store = mockStore({
            scratchGui: {
                projectChanged: true,
                thingbotTelemetrix: {loaded: false, connected: false, connecting: false},
                vm: {
                    events: {addListener: () => {}, removeListener: () => {}},
                    extensionManager: {isExtensionLoaded: () => false}
                }
            }
        });
        let ask;
        const Inner = props => {
            ask = props.confirmReadyToReplaceProject;
            return null;
        };
        const Wrapped = MenuBarHOC(Inner);
        render(<Wrapped
            store={store}
            canCreateNew={false}
            canSave={false}
            projectChanged
        />);
        await expect(ask('Thay thế?', {okLabel: 'Thay thế', cancelLabel: 'Hủy'})).resolves.toBe(true);
        expect(confirm).toHaveBeenCalledWith('Thay thế?');
    } finally {
        confirm.mockRestore();
    }
});
