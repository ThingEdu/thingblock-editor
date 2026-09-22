import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessage, defineMessages, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import VM from '@scratch/scratch-vm';

import {openBoardLibrary} from '../../reducers/modals';
import UploadModal from '../device-controls/upload-modal.jsx';

import menuBarStyles from './menu-bar.css';
import styles from './board-menu.css';

const boardMenuMessage = defineMessage({
    id: 'gui.menuBar.board',
    defaultMessage: 'Board: {boardName}',
    description: 'Board selection menu item in the menu bar'
});

const selectBoardMessage = defineMessage({
    id: 'gui.menuBar.selectBoard',
    defaultMessage: 'Select board',
    description: 'Board menu button label when no board has been selected'
});

const messages = defineMessages({
    confirmWarning: {
        id: 'gui.menuBar.restoreFirmwareConfirm',
        defaultMessage: 'Restoring "{firmwareName}" erases and replaces whatever program is ' +
            'currently on the board. This can’t be undone.',
        description: 'Warning shown before restoring a board\'s live-mode firmware'
    },
    confirmFlash: {
        id: 'gui.menuBar.restoreFirmwareConfirmFlash',
        defaultMessage: 'Flash',
        description: 'Button that confirms restoring live-mode firmware, erasing the board\'s program'
    },
    confirmCancel: {
        id: 'gui.menuBar.restoreFirmwareConfirmCancel',
        defaultMessage: 'Cancel',
        description: 'Button that backs out of restoring live-mode firmware'
    }
});

const BoardMenu = ({
    selectedDeviceId,
    vm,
    onOpenBoardLibrary
}) => {
    const intl = useIntl();
    // The firmware entry awaiting confirmation, or null; flashing must not start before this is
    // confirmed, since it erases whatever program is on the board.
    const [pendingFirmware, setPendingFirmware] = useState(null);
    // null while idle; otherwise one of the states UploadModal understands. A firmware flash has no
    // compile phase, so this only ever moves through 'uploading' -> 'done' | 'cancelled' | 'error'.
    const [flashStatus, setFlashStatus] = useState(null);
    const [flashLogs, setFlashLogs] = useState([]);
    const [flashError, setFlashError] = useState(null);
    const unmountedRef = useRef(false);
    useEffect(() => () => {
        unmountedRef.current = true;
    }, []);

    const selectedDevice = selectedDeviceId ?
        vm.getDeviceList().find(device => device.deviceId === selectedDeviceId) :
        null;
    const label = selectedDevice ?
        intl.formatMessage(boardMenuMessage, {boardName: selectedDevice.name}) :
        intl.formatMessage(selectBoardMessage);
    // Firmware is only offered for a selected device whose pack declares images, on a client that can
    // actually flash one — cloud mode's client cannot, and a learner must never be offered a rescue
    // that is doomed to reject.
    const canFlashFirmware = Boolean(vm.client && vm.client.canFlashFirmware);
    const firmwareList = selectedDevice && canFlashFirmware ? vm.getDeviceFirmware(selectedDeviceId) : [];

    const handleSelectFirmware = useCallback(event => {
        const firmware = firmwareList.find(candidate => candidate.id === event.currentTarget.dataset.firmwareId);
        setPendingFirmware(firmware);
    }, [firmwareList]);

    const handleCancelConfirm = useCallback(() => {
        setPendingFirmware(null);
    }, []);

    const handleConfirmFlash = useCallback(() => {
        const firmware = pendingFirmware;
        setPendingFirmware(null);
        setFlashStatus('uploading');
        setFlashLogs([]);
        setFlashError(null);
        vm.flashDeviceFirmware(selectedDeviceId, firmware.id, {
            onLog: chunk => {
                if (unmountedRef.current) return;
                setFlashLogs(logs => [...logs, chunk]);
            }
        })
            .then(() => {
                if (unmountedRef.current) return;
                setFlashStatus('done');
            })
            .catch(error => {
                if (unmountedRef.current) return;
                // A user cancel rejects with the helper's 'cancelled' code, same as an ordinary
                // upload; show it as cancelled rather than a failure.
                if (error && error.code === 'cancelled') {
                    setFlashStatus('cancelled');
                    return;
                }
                setFlashStatus('error');
                setFlashError(error && error.message);
            });
    }, [pendingFirmware, selectedDeviceId, vm]);

    const handleCancelFlash = useCallback(() => {
        vm.cancelUpload();
    }, [vm]);

    const handleCloseFlash = useCallback(() => {
        setFlashStatus(null);
    }, []);

    return (
        <div className={styles.container}>
            <button
                className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable)}
                aria-label={label}
                onClick={onOpenBoardLibrary}
            >
                <span className={styles.label}>{label}</span>
            </button>
            {firmwareList.map(firmware => (
                <button
                    key={firmware.id}
                    data-firmware-id={firmware.id}
                    className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable)}
                    disabled={flashStatus === 'uploading'}
                    onClick={handleSelectFirmware}
                >
                    {firmware.name}
                </button>
            ))}
            {pendingFirmware && (
                <div
                    className={styles.confirmDialog}
                    role="alertdialog"
                    aria-label={intl.formatMessage(messages.confirmWarning, {
                        firmwareName: pendingFirmware.name
                    })}
                >
                    <p className={styles.confirmMessage}>
                        {intl.formatMessage(messages.confirmWarning, {firmwareName: pendingFirmware.name})}
                    </p>
                    <div className={styles.confirmActions}>
                        <button onClick={handleCancelConfirm}>
                            {intl.formatMessage(messages.confirmCancel)}
                        </button>
                        <button onClick={handleConfirmFlash}>
                            {intl.formatMessage(messages.confirmFlash)}
                        </button>
                    </div>
                </div>
            )}
            {flashStatus && (
                <UploadModal
                    status={flashStatus}
                    logs={flashLogs}
                    error={flashError}
                    onCancel={handleCancelFlash}
                    onClose={handleCloseFlash}
                />
            )}
        </div>
    );
};

BoardMenu.propTypes = {
    onOpenBoardLibrary: PropTypes.func.isRequired,
    selectedDeviceId: PropTypes.string,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    selectedDeviceId: state.scratchGui.board.selectedDeviceId,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onOpenBoardLibrary: () => dispatch(openBoardLibrary())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BoardMenu);
