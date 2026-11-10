import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {screen} from '@testing-library/react';

import DeviceCard from '../../../src/components/device-card/device-card.jsx';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';

describe('DeviceCard', () => {
    const defaultProps = {
        description: 'The classic board for getting started.',
        help: 'https://example.com/help',
        iconURL: 'arduino-uno.svg',
        itemKey: 'arduinoUno',
        learnMore: 'https://example.com/learn-more',
        manufacturer: 'arduino.cc',
        name: 'Arduino Uno',
        onSelect: jest.fn(),
        requires: 'serial'
    };

    beforeEach(() => {
        defaultProps.onSelect.mockClear();
    });

    const renderCard = props => renderWithIntl(
        <DeviceCard
            {...defaultProps}
            {...props}
        />
    );

    test('selects the device with the card button', async () => {
        const user = userEvent.setup();
        renderCard();

        await user.click(screen.getByRole('button', {name: /Arduino Uno/i}));

        expect(screen.getByRole('button', {name: /Arduino Uno/i}).tagName).toBe('BUTTON');
        expect(defaultProps.onSelect).toHaveBeenCalledWith('arduinoUno');
    });

    test('does not select the device when a link is opened', async () => {
        const user = userEvent.setup();
        renderCard();

        await user.click(screen.getByRole('link', {name: 'Learn more'}));

        expect(defaultProps.onSelect).not.toHaveBeenCalled();
    });
});
