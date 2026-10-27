import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {screen} from '@testing-library/react';

import PeripheralCard from '../../../src/components/peripheral-card/peripheral-card.jsx';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';

describe('PeripheralCard', () => {
    const defaultProps = {
        active: false,
        description: 'A hobby servo motor.',
        id: 'servo',
        locked: false,
        name: 'Servo',
        onToggle: jest.fn()
    };

    beforeEach(() => {
        defaultProps.onToggle.mockClear();
    });

    const renderCard = props => renderWithIntl(
        <PeripheralCard
            {...defaultProps}
            {...props}
        />
    );

    test('an inactive peripheral shows Add and toggles on by id when clicked', async () => {
        const user = userEvent.setup();
        renderCard();

        expect(screen.getByText('Add')).toBeInTheDocument();
        await user.click(screen.getByRole('button', {name: /Servo/i}));
        expect(defaultProps.onToggle).toHaveBeenCalledWith('servo');
    });

    test('an active peripheral shows Remove and toggles off when clicked', async () => {
        const user = userEvent.setup();
        renderCard({active: true});

        expect(screen.getByText('Remove')).toBeInTheDocument();
        await user.click(screen.getByRole('button', {name: /Servo/i}));
        expect(defaultProps.onToggle).toHaveBeenCalledWith('servo');
    });

    test('a locked peripheral shows Included and cannot be toggled', async () => {
        const user = userEvent.setup();
        renderCard({active: true, locked: true});

        expect(screen.getByText('Included')).toBeInTheDocument();
        const button = screen.getByRole('button', {name: /Servo/i});
        expect(button).toBeDisabled();
        await user.click(button);
        expect(defaultProps.onToggle).not.toHaveBeenCalled();
    });
});
