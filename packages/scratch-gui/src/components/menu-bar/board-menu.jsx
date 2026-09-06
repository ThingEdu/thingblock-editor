import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessage, defineMessages, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import VM from '@scratch/scratch-vm';

import {openBoardLibrary} from '../../reducers/modals';

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
    restoreFirmwareItem: {
        id: 'gui.menuBar.restoreFirmwareItem',
        defaultMessage: '{firmwareName}',
        description: 'Menu item offering to restore one of the board\'s live-mode firmware images; ' +
            'the name is already localized by the device pack'
    },
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
    },
    flashing: {
        id: 'gui.menuBar.restoreFirmwareFlashing',
        defaultMessage: 'Restoring live mode…',
        description: 'Status shown while the board\'s live-mode firmware is being flashed'
    },
    flashDone: {
        id: 'gui.menuBar.restoreFirmwareDone',
        defaultMessage: 'Live mode restored.',
        description: 'Status shown after the board\'s live-mode firmware finished flashing'
    },
    flashError: {
        id: 'gui.menuBar.restoreFirmwareError',
        defaultMessage: 'Couldn’t restore live mode: {error}',
        description: 'Status shown when restoring live-mode firmware fails'
    },
    dismiss: {
        id: 'gui.menuBar.restoreFirmwareDismiss',
        defaultMessage: 'OK',
        description: 'Button that dismisses the live-mode firmware restore result'
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
    // null | 'flashing' | 'done' | 'error'.
    const [flashStatus, setFlashStatus] = useState(null);
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
    // Firmware is only offered for a selected, connected-capable device; a board pack that declares
    // none opts out of the restore feature entirely.
    const firmwareList = selectedDevice ? vm.getDeviceFirmware(selectedDeviceId) : [];

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
        setFlashStatus('flashing');
        setFlashError(null);
        vm.flashDeviceFirmware(selectedDeviceId, firmware.id, {})
            .then(() => {
                if (unmountedRef.current) return;
                setFlashStatus('done');
            })
            .catch(error => {
                if (unmountedRef.current) return;
                setFlashStatus('error');
                setFlashError(error.message);
            });
    }, [pendingFirmware, selectedDeviceId, vm]);

    const handleDismissFlashStatus = useCallback(() => {
        setFlashStatus(null);
        setFlashError(null);
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
                    disabled={flashStatus === 'flashing'}
                    onClick={handleSelectFirmware}
                >
                    {intl.formatMessage(messages.restoreFirmwareItem, {firmwareName: firmware.name})}
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
                <div
                    className={styles.flashStatus}
                    role="status"
                >
                    {flashStatus === 'flashing' && (
                        <span>{intl.formatMessage(messages.flashing)}</span>
                    )}
                    {flashStatus === 'done' && (
                        <React.Fragment>
                            <span>{intl.formatMessage(messages.flashDone)}</span>
                            <button onClick={handleDismissFlashStatus}>
                                {intl.formatMessage(messages.dismiss)}
                            </button>
                        </React.Fragment>
                    )}
                    {flashStatus === 'error' && (
                        <React.Fragment>
                            <span>{intl.formatMessage(messages.flashError, {error: flashError})}</span>
                            <button onClick={handleDismissFlashStatus}>
                                {intl.formatMessage(messages.dismiss)}
                            </button>
                        </React.Fragment>
                    )}
                </div>
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
