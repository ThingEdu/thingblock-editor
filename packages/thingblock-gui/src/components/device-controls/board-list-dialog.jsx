import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {defineMessages, useIntl} from 'react-intl';

import Modal from '../../containers/modal.jsx';
import Box from '../box/box.jsx';
import ScanningStep from '../connection-modal/scanning-step.jsx';

import radarIcon from '../connection-modal/icons/searching.png';

import styles from '../connection-modal/connection-modal.css';

const messages = defineMessages({
    title: {
        id: 'gui.boardListDialog.title',
        defaultMessage: 'Connect a board',
        description: 'Title of the dialog that lists boards available to connect'
    },
    connecting: {
        id: 'gui.boardListDialog.connecting',
        defaultMessage: 'Connecting to {name}…',
        description: 'Text shown while connecting to the board picked from the list'
    },
    connectError: {
        id: 'gui.boardListDialog.connectError',
        defaultMessage: 'Couldn’t connect: {error}',
        description: 'Text shown above the board list when connecting to the picked board failed'
    }
});

// Reuses the connection modal's scanning step (radar / device tiles / refresh) so the board picker
// matches the peripheral connection UI. Boards are mapped onto the peripheral shape the step expects;
// they have no signal strength, so `rssi` is a constant.
const BoardListDialog = ({
    boards,
    scanning,
    connectingBoard,
    connectError,
    deviceIconURL,
    onConnectBoard,
    onScan,
    onCloseDialog
}) => {
    const intl = useIntl();
    const peripheralList = (boards || []).map(board => ({
        peripheralId: board.id,
        name: board.name,
        rssi: 0
    }));
    // ScanningStep shows its tile list only while `scanning` is true (the BLE flow scans continuously);
    // it falls back to "No devices found" otherwise. Our scan is one-shot, so keep that view alive
    // whenever a scan is in flight or we have boards to show — only an empty, finished scan is "none".
    const showingBoards = scanning || peripheralList.length > 0;
    return (
        <Modal
            className={classNames(styles.modalContent, styles.boardListModalContent)}
            contentLabel={intl.formatMessage(messages.title)}
            headerClassName={styles.header}
            id="boardListDialog"
            onRequestClose={onCloseDialog}
        >
            {connectingBoard ? (
                <Box className={styles.body}>
                    <Box className={classNames(styles.activityArea, styles.boardListActivityArea)}>
                        <div className={styles.centeredRow}>
                            <img
                                className={classNames(styles.radarSmall, styles.radarSpin)}
                                src={radarIcon}
                            />
                            {intl.formatMessage(messages.connecting, {name: connectingBoard.name})}
                        </div>
                    </Box>
                </Box>
            ) : (
                <React.Fragment>
                    {connectError && (
                        <div className={styles.boardListError}>
                            {intl.formatMessage(messages.connectError, {error: connectError})}
                        </div>
                    )}
                    <ScanningStep
                        activityAreaClassName={styles.boardListActivityArea}
                        bottomAreaClassName={styles.boardListBottomArea}
                        connectionSmallIconURL={deviceIconURL}
                        peripheralTileClassName={styles.boardListPeripheralTile}
                        peripheralList={peripheralList}
                        scanning={showingBoards}
                        showSignalStrength={false}
                        showStepDots={false}
                        onConnecting={onConnectBoard}
                        onRefresh={onScan}
                    />
                </React.Fragment>
            )}
        </Modal>
    );
};

BoardListDialog.propTypes = {
    boards: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string
    })),
    connectError: PropTypes.string,
    connectingBoard: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string
    }),
    deviceIconURL: PropTypes.string,
    onCloseDialog: PropTypes.func.isRequired,
    onConnectBoard: PropTypes.func.isRequired,
    onScan: PropTypes.func.isRequired,
    scanning: PropTypes.bool
};

export default BoardListDialog;
