import 'web-audio-test-api';

import React from 'react';
import configureStore from 'redux-mock-store';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import {LoadingState} from '../../../src/reducers/project-state';
import VM from '@thingblock/thingblock-vm';

import SBFileUploaderHOC from '../../../src/lib/sb-file-uploader-hoc.jsx';
import {IntlProvider} from 'react-intl';

describe('SBFileUploaderHOC', () => {
    const mockStore = configureStore();
    let store;
    let vm;

    // Wrap this in a function so it gets test specific states and can be reused.
    const getContainer = function () {
        const Component = () => <div />;
        return SBFileUploaderHOC(Component);
    };

    const unwrappedInstance = () => {
        const WrappedComponent = getContainer();
        // default starting state: looking at a project you created, not logged in
        const wrapper = renderWithIntl(
            <WrappedComponent
                projectChanged
                canSave={false}
                cancelFileUpload={jest.fn()}
                closeFileMenu={jest.fn()}
                requestProjectUpload={jest.fn()}
                userOwnsProject={false}
                vm={vm}
                onLoadingFinished={jest.fn()}
                onLoadingStarted={jest.fn()}
                onUpdateProjectTitle={jest.fn()}
                store={store}
            />
        );
        return wrapper;
    };

    beforeEach(() => {
        vm = new VM();
        store = mockStore({
            scratchGui: {
                projectState: {
                    loadingState: LoadingState.SHOWING_WITHOUT_ID
                },
                vm: {}
            },
            locales: {
                locale: 'en'
            }
        });
    });

    test('if isLoadingUpload becomes true, without fileToUpload set, will call cancelFileUpload', () => {
        const mockedCancelFileUpload = jest.fn();
        const WrappedComponent = getContainer();
        const {rerender} = renderWithIntl(
            <WrappedComponent
                projectChanged
                canSave={false}
                cancelFileUpload={mockedCancelFileUpload}
                closeFileMenu={jest.fn()}
                isLoadingUpload={false}
                requestProjectUpload={jest.fn()}
                store={store}
                userOwnsProject={false}
                vm={vm}
                onLoadingFinished={jest.fn()}
                onLoadingStarted={jest.fn()}
                onUpdateProjectTitle={jest.fn()}
            />
        );
        rerender(
            <IntlProvider
                locale="en"
                messages={{ }}
            >
                <WrappedComponent
                    projectChanged
                    canSave={false}
                    cancelFileUpload={mockedCancelFileUpload}
                    closeFileMenu={jest.fn()}
                    isLoadingUpload
                    requestProjectUpload={jest.fn()}
                    store={store}
                    userOwnsProject={false}
                    vm={vm}
                    onLoadingFinished={jest.fn()}
                    onLoadingStarted={jest.fn()}
                    onUpdateProjectTitle={jest.fn()}
                />
            </IntlProvider>
        );
        expect(mockedCancelFileUpload).toHaveBeenCalled();
    });
    test('loading an example fetches its .tb and opens it like a chosen file', async () => {
        let startLoadingExample;
        const Component = ({onStartLoadingExample}) => {
            startLoadingExample = onStartLoadingExample;
            return <div />;
        };
        const WrappedComponent = SBFileUploaderHOC(Component);
        const data = new ArrayBuffer(4);
        global.fetch = jest.fn(() => Promise.resolve({ok: true, arrayBuffer: () => Promise.resolve(data)}));
        vm.project.load = jest.fn(() => Promise.resolve());
        const props = {
            canSave: false,
            cancelFileUpload: jest.fn(),
            projectChanged: false,
            requestProjectUpload: jest.fn(),
            store: store,
            userOwnsProject: false,
            vm: vm,
            onLoadingFinished: jest.fn(),
            onLoadingStarted: jest.fn(),
            onSetProjectTitle: jest.fn()
        };
        const {rerender} = renderWithIntl(<WrappedComponent
            {...props}
            isLoadingUpload={false}
        />);

        startLoadingExample({url: 'http://host/examples/thingbot/a.tb', title: 'Robot vũ công'});
        expect(props.requestProjectUpload).toHaveBeenCalled();

        rerender(
            <IntlProvider locale="en">
                <WrappedComponent
                    {...props}
                    isLoadingUpload
                />
            </IntlProvider>
        );
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(global.fetch).toHaveBeenCalledWith('http://host/examples/thingbot/a.tb');
        expect(vm.project.load).toHaveBeenCalledWith(data);
        expect(props.onSetProjectTitle).toHaveBeenCalledWith('Robot vũ công');
        expect(props.onLoadingFinished).toHaveBeenCalledWith(expect.anything(), true);
        expect(props.cancelFileUpload).not.toHaveBeenCalled();
    });
});
