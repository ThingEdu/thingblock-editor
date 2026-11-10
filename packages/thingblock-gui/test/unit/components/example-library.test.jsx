import React from 'react';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import {render, screen, waitFor, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import VM from '@thingblock/thingblock-vm';

import ExampleLibrary from '../../../src/containers/example-library.jsx';

jest.mock('../../../src/components/library/library.jsx', () => {
    const MockLibraryComponent = ({data, renderItem, tags, onItemSelected}) => (
        <div>
            <div data-testid="tags">{tags.map(t => t.tag).join('|')}</div>
            {data.map(item => renderItem(item, item.name, () => onItemSelected(item)))}
        </div>
    );
    return MockLibraryComponent;
});

describe('ExampleLibrary', () => {
    const index = {
        groups: ['K12 cơ bản', 'FanRoc'],
        examples: [
            {
                id: 'k12-01',
                file: 'thingbot/k12-01.tb',
                title: 'Đèn hội trăng rằm',
                group: 'K12 cơ bản',
                level: 1,
                description: 'Hai đèn nháy so le.',
                hardware: ['LED_1, LED_2 trên mạch']
            },
            {
                id: 'k12-20',
                file: 'thingbot/k12-20.tb',
                title: 'Robot FanRoc hoàn chỉnh',
                group: 'FanRoc',
                level: 3,
                description: 'Mẫu robot thi đấu.',
                hardware: []
            }
        ]
    };
    let vm;

    beforeEach(() => {
        vm = Object.create(VM.prototype);
        vm.devices = {getExamplesOrigin: jest.fn(() => 'http://host/resources/examples')};
        global.fetch = jest.fn(() => Promise.resolve({ok: true, json: () => Promise.resolve(index)}));
    });

    const renderLibrary = (onSelectExample = jest.fn(), visible = true) => render(
        <Provider store={configureStore()({scratchGui: {modals: {exampleLibrary: visible}, vm}})}>
            <IntlProvider locale="en">
                <ExampleLibrary onSelectExample={onSelectExample} />
            </IntlProvider>
        </Provider>
    );

    test('lists the examples from the pack index, tagged by group', async () => {
        renderLibrary();

        expect(await screen.findByRole('button', {name: /Đèn hội trăng rằm/})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /Robot FanRoc hoàn chỉnh/})).toBeInTheDocument();
        expect(screen.getByText('LED_1, LED_2 trên mạch')).toBeInTheDocument();
        expect(screen.getByTestId('tags')).toHaveTextContent('K12 cơ bản|FanRoc');
        expect(global.fetch).toHaveBeenCalledWith('http://host/resources/examples/index.json');
    });

    test('choosing an example hands its .tb URL and title to onSelectExample', async () => {
        const onSelectExample = jest.fn();
        renderLibrary(onSelectExample);

        fireEvent.click(await screen.findByRole('button', {name: /Robot FanRoc hoàn chỉnh/}));

        expect(onSelectExample).toHaveBeenCalledWith({
            url: 'http://host/resources/examples/thingbot/k12-20.tb',
            title: 'Robot FanRoc hoàn chỉnh'
        });
    });

    test('renders nothing and fetches nothing while hidden', async () => {
        const {container} = renderLibrary(jest.fn(), false);

        await waitFor(() => expect(container).toBeEmptyDOMElement());
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
