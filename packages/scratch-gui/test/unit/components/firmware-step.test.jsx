import React from 'react';
import {IntlProvider} from 'react-intl';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import VM from '@scratch/scratch-vm';

import FirmwareStep from '../../../src/components/connection-modal/firmware-step.jsx';

describe('FirmwareStep', () => {
    const firmware = {deviceId: 'thingbot', firmwareId: 'telemetrix-ble'};
    const port = {id: '/dev/ttyUSB0', name: 'ThingBot (ttyUSB0)'};
    let vm;

    beforeEach(() => {
        vm = new VM();
        jest.spyOn(vm, 'listBoards').mockResolvedValue([port]);
        jest.spyOn(vm, 'connectBoard').mockResolvedValue();
        jest.spyOn(vm, 'disconnectBoard').mockResolvedValue();
        jest.spyOn(vm, 'flashDeviceFirmware').mockResolvedValue();
    });

    afterEach(() => jest.restoreAllMocks());

    const renderStep = (props = {}) => {
        const onScanning = jest.fn();
        render(
            <IntlProvider locale="en">
                <FirmwareStep
                    firmware={firmware}
                    vm={vm}
                    onScanning={onScanning}
                    {...props}
                />
            </IntlProvider>
        );
        return {onScanning};
    };

    test('flashes only after Install, on a port it opens and then releases', async () => {
        const {onScanning} = renderStep();

        await screen.findByText(port.name);
        expect(vm.flashDeviceFirmware).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', {name: 'Install'}));

        await screen.findByText('Firmware installed');
        expect(vm.listBoards).toHaveBeenCalledWith('thingbot');
        expect(vm.connectBoard).toHaveBeenCalledWith(port);
        expect(vm.flashDeviceFirmware).toHaveBeenCalledWith('thingbot', 'telemetrix-ble');
        await waitFor(() => expect(vm.disconnectBoard).toHaveBeenCalled());

        // The user starts the Bluetooth scan themselves.
        expect(onScanning).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', {name: 'Connect'}));
        expect(onScanning).toHaveBeenCalled();
    });

    test('flashes an already connected board without reconnecting or releasing it', async () => {
        renderStep({connectedBoard: port});

        fireEvent.click(await screen.findByRole('button', {name: 'Install'}));

        await screen.findByText('Firmware installed');
        expect(vm.listBoards).not.toHaveBeenCalled();
        expect(vm.connectBoard).not.toHaveBeenCalled();
        expect(vm.disconnectBoard).not.toHaveBeenCalled();
    });

    test('shows the error when the flash fails', async () => {
        vm.flashDeviceFirmware.mockRejectedValue(new Error('esptool exited 2'));
        renderStep();

        fireEvent.click(await screen.findByRole('button', {name: 'Install'}));

        expect(await screen.findByText(/esptool exited 2/)).toBeInTheDocument();
    });

    test('returns to the port list when the flash is stopped', async () => {
        vm.flashDeviceFirmware.mockRejectedValue(Object.assign(new Error('cancelled'), {code: 'cancelled'}));
        renderStep();

        fireEvent.click(await screen.findByRole('button', {name: 'Install'}));

        await waitFor(() => expect(vm.listBoards).toHaveBeenCalledTimes(2));
        expect(await screen.findByRole('button', {name: 'Install'})).toBeInTheDocument();
    });
});
