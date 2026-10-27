import '@testing-library/jest-dom';
import React from 'react';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import {screen} from '@testing-library/react';

import {PLATFORM} from '../../../src/lib/platform';
import LibraryItemContainer from '../../../src/containers/library-item.jsx';

jest.mock('../../../src/components/library-item/library-item.jsx', () => {
    const React = require('react');
    const PropTypes = require('prop-types');
    const MockLibraryItemComponent = props => (
        <button
            className={props.fixedSize ? 'featuredItemFixed' : null}
            data-fixed-size={props.fixedSize ? 'true' : 'false'}
        >
            {props.name}
        </button>
    );
    MockLibraryItemComponent.propTypes = {
        iconSource: PropTypes.shape({})
    };
    return MockLibraryItemComponent;
});

describe('LibraryItemContainer', () => {
    const renderLibraryItem = props => {
        const store = configureStore()({
            scratchGui: {
                platform: {
                    platform: PLATFORM.WEB
                }
            }
        });

        return renderWithIntl(
            <Provider store={store}>
                <LibraryItemContainer
                    featured
                    fixedSize
                    icons={{uri: 'board.svg'}}
                    id="arduino:avr:uno"
                    name="Arduino Uno"
                    onMouseEnter={jest.fn()}
                    onMouseLeave={jest.fn()}
                    onSelect={jest.fn()}
                    {...props}
                />
            </Provider>
        );
    };

    test('forwards fixedSize to the library item component', () => {
        renderLibraryItem();

        const item = screen.getByRole('button', {name: 'Arduino Uno'});
        expect(item).toHaveAttribute('data-fixed-size', 'true');
        expect(item).toHaveClass('featuredItemFixed');
    });
});
