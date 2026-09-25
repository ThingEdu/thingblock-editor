import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FormattedMessage} from 'react-intl';
import VM from '@scratch/scratch-vm';

import Box from '../box/box.jsx';
import PeripheralTile from './peripheral-tile.jsx';

import backIcon from './icons/back.svg';
import radarIcon from './icons/searching.png';
import refreshIcon from './icons/refresh.svg';
import warningIcon from './icons/warning.svg';

import styles from './connection-modal.css';

/**
 * Installs the extension's live-mode firmware over USB through the link helper.
 * The live connection itself runs over Bluetooth, so this step picks a USB port of its own.
 */
const FirmwareStep = ({
    connectedBoard,
    connectionSmallIconURL,
    firmware,
    vm,
    onScanning
}) => {
    // 'listing' | 'ports' | 'flashing' | 'done' | 'error'
    const [status, setStatus] = useState('listing');
    const [ports, setPorts] = useState([]);
    const [error, setError] = useState(null);
    const unmountedRef = useRef(false);
    useEffect(() => () => {
        unmountedRef.current = true;
    }, []);

    // A board already connected over USB is the only target; otherwise list the ports matching the device.
    const listPorts = useCallback(() => {
        if (connectedBoard) {
            setPorts([connectedBoard]);
            setStatus('ports');
            return;
        }
        setStatus('listing');
        vm.listBoards(firmware.deviceId)
            .catch(err => {
                // eslint-disable-next-line no-console
                console.warn(`FirmwareStep: listBoards failed: ${err.message}`);
                return [];
            })
            .then(boards => {
                if (unmountedRef.current) return;
                setPorts(boards);
                setStatus('ports');
            });
    }, [connectedBoard, firmware.deviceId, vm]);

    useEffect(listPorts, [listPorts]);

    const handleInstall = useCallback(portId => {
        const port = ports.find(candidate => candidate.id === portId);
        // Only release the port afterwards if this step opened it.
        const ownsPort = !connectedBoard;
        setStatus('flashing');
        (ownsPort ? vm.connectBoard(port) : Promise.resolve())
            .then(() => vm.flashDeviceFirmware(firmware.deviceId, firmware.firmwareId))
            .then(() => {
                if (unmountedRef.current) return;
                setStatus('done');
            })
            .catch(err => {
                if (unmountedRef.current) return;
                if (err && err.code === 'cancelled') {
                    listPorts();
                    return;
                }
                setError((err && err.message) || '');
                setStatus('error');
            })
            .finally(() => {
                if (!ownsPort) return;
                vm.disconnectBoard().catch(err => {
                    // eslint-disable-next-line no-console
                    console.warn(`FirmwareStep: disconnectBoard failed: ${err.message}`);
                });
            });
    }, [connectedBoard, firmware, listPorts, ports, vm]);

    const handleStop = useCallback(() => {
        vm.cancelUpload();
    }, [vm]);

    return (
        <Box className={styles.body}>
            <Box className={styles.activityArea}>
                {status === 'ports' && ports.length > 0 ? (
                    <div className={styles.peripheralTilePane}>
                        {ports.map(port => (
                            <PeripheralTile
                                actionLabel={
                                    <FormattedMessage
                                        defaultMessage="Install"
                                        description="Button that installs the live-mode firmware on a USB board"
                                        id="gui.connection.firmware.install"
                                    />
                                }
                                connectionSmallIconURL={connectionSmallIconURL}
                                key={port.id}
                                name={port.name}
                                peripheralId={port.id}
                                showSignalStrength={false}
                                onConnecting={handleInstall}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.activityAreaInfo}>
                        <div className={styles.centeredRow}>
                            {(status === 'listing' || status === 'flashing') && (
                                <img
                                    className={classNames(styles.radarSmall, styles.radarSpin)}
                                    src={radarIcon}
                                />
                            )}
                            {(status === 'ports' || status === 'error') && (
                                <img
                                    className={styles.helpStepImage}
                                    src={warningIcon}
                                />
                            )}
                            {status === 'listing' && (
                                <FormattedMessage
                                    defaultMessage="Looking for USB boards"
                                    description="Text shown while listing USB boards to install firmware on"
                                    id="gui.connection.firmware.listing"
                                />
                            )}
                            {status === 'ports' && (
                                <FormattedMessage
                                    defaultMessage="No USB boards found"
                                    description="Text shown when no USB board could be found to install firmware on"
                                    id="gui.connection.firmware.noPorts"
                                />
                            )}
                            {status === 'flashing' && (
                                <FormattedMessage
                                    defaultMessage="Installing firmware…"
                                    description="Text shown while the live-mode firmware is being written to the board"
                                    id="gui.connection.firmware.flashing"
                                />
                            )}
                            {status === 'done' && (
                                <FormattedMessage
                                    defaultMessage="Firmware installed"
                                    description="Text shown when the live-mode firmware was written successfully"
                                    id="gui.connection.firmware.done"
                                />
                            )}
                            {status === 'error' && (
                                <FormattedMessage
                                    defaultMessage="Firmware install didn’t finish: {error}"
                                    description="Text shown when writing the live-mode firmware failed"
                                    id="gui.connection.firmware.error"
                                    values={{error}}
                                />
                            )}
                        </div>
                    </div>
                )}
            </Box>
            <Box className={styles.bottomArea}>
                <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
                    {status === 'ports' && (
                        <FormattedMessage
                            defaultMessage="Plug your board in with a USB cable. Installing erases the program on it."
                            description="Instructions and warning shown before installing the live-mode firmware"
                            id="gui.connection.firmware.instructions"
                        />
                    )}
                    {status === 'done' && (
                        <FormattedMessage
                            defaultMessage="Your board is ready for live mode."
                            description="Instructions shown after the live-mode firmware was installed"
                            id="gui.connection.firmware.doneInstructions"
                        />
                    )}
                </Box>
                <Box className={classNames(styles.bottomAreaItem, styles.buttonRow)}>
                    {(status === 'ports' || status === 'error') && (
                        <React.Fragment>
                            <button
                                className={styles.connectionButton}
                                onClick={onScanning}
                            >
                                <img
                                    className={classNames(styles.buttonIconLeft, styles.buttonIconBack)}
                                    src={backIcon}
                                />
                                <FormattedMessage
                                    defaultMessage="Back"
                                    description="Button that leaves the firmware install and returns to the device scan"
                                    id="gui.connection.firmware.back"
                                />
                            </button>
                            <button
                                className={styles.connectionButton}
                                onClick={listPorts}
                            >
                                <FormattedMessage
                                    defaultMessage="Refresh"
                                    description="Button in prompt for starting a search"
                                    id="gui.connection.search"
                                />
                                <img
                                    className={styles.buttonIconRight}
                                    src={refreshIcon}
                                />
                            </button>
                        </React.Fragment>
                    )}
                    {status === 'flashing' && (
                        <button
                            className={styles.connectionButton}
                            onClick={handleStop}
                        >
                            <FormattedMessage
                                defaultMessage="Stop"
                                description="Button that aborts the in-progress firmware install"
                                id="gui.connection.firmware.stop"
                            />
                        </button>
                    )}
                    {status === 'done' && (
                        <button
                            className={styles.connectionButton}
                            onClick={onScanning}
                        >
                            <FormattedMessage
                                defaultMessage="Connect"
                                description="Button that goes to the device scan after installing the firmware"
                                id="gui.connection.firmware.connect"
                            />
                        </button>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

FirmwareStep.propTypes = {
    connectedBoard: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string
    }),
    connectionSmallIconURL: PropTypes.string,
    firmware: PropTypes.shape({
        deviceId: PropTypes.string.isRequired,
        firmwareId: PropTypes.string.isRequired
    }).isRequired,
    onScanning: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default FirmwareStep;
