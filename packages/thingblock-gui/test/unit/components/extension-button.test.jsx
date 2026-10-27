import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {screen} from '@testing-library/react';

import ExtensionButton from '../../../src/components/extension-button/extension-button.jsx';
import {ModalFocusProvider} from '../../../src/contexts/modal-focus-context.jsx';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';

describe('ExtensionButton', () => {
    const renderButton = props => renderWithIntl(
        <ModalFocusProvider>
            <ExtensionButton
                onExtensionButtonClick={jest.fn()}
                {...props}
            />
        </ModalFocusProvider>
    );

    test('host mode labels the button "Add Extension"', () => {
        renderButton({boardMode: false});
        expect(screen.getByRole('button', {name: 'Add Extension'})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Add Peripheral'})).not.toBeInTheDocument();
    });

    test('board mode labels the button "Add Peripheral"', () => {
        renderButton({boardMode: true});
        expect(screen.getByRole('button', {name: 'Add Peripheral'})).toBeInTheDocument();
    });

    test('clicking invokes the provided handler', async () => {
        const onExtensionButtonClick = jest.fn();
        const user = userEvent.setup();
        renderButton({boardMode: true, onExtensionButtonClick});

        await user.click(screen.getByRole('button', {name: 'Add Peripheral'}));
        expect(onExtensionButtonClick).toHaveBeenCalled();
    });
});
