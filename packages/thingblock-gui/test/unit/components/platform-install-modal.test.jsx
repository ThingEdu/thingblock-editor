import React from 'react';
import '@testing-library/jest-dom';
import {screen, fireEvent} from '@testing-library/react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import PlatformInstallModal from '../../../src/components/platform-install-modal/platform-install-modal.jsx';

jest.mock('../../../src/containers/modal.jsx', () => {
    const MockModal = ({children, contentLabel}) => (
        <div aria-label={contentLabel}>
            {children}
        </div>
    );
    return MockModal;
});

describe('PlatformInstallModal', () => {
    const renderModal = props => renderWithIntl(
        <PlatformInstallModal
            platformName="esp32"
            onInstall={jest.fn()}
            onCancel={jest.fn()}
            onClose={jest.fn()}
            {...props}
        />
    );

    test('installing state shows the progress bar, phase, and a Stop button', () => {
        const onCancel = jest.fn();
        renderModal({
            status: 'installing',
            progress: {phase: 'esp32-arduino-libs', percent: 40},
            onCancel
        });

        expect(screen.getByText(/Downloading the esp32 board package/)).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
        expect(screen.getByText('esp32-arduino-libs')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Stop'));
        expect(onCancel).toHaveBeenCalled();
    });

    test('installing without structured progress renders an indeterminate bar', () => {
        renderModal({status: 'installing'});
        expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    });

    test('streamed logs are revealed by the Details toggle', () => {
        renderModal({status: 'installing', logs: ['Tool downloaded\n']});

        // Collapsed by default while installing.
        expect(screen.queryByText(/Tool downloaded/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Details'));
        expect(screen.getByText(/Tool downloaded/)).toBeInTheDocument();
    });
});
