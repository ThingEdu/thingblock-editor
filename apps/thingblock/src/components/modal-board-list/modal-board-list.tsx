import classNames from 'classnames'
import { defineMessages, useIntl } from 'react-intl'
import type { ConnectedBoard } from '../../reducers/board'
import Box from '../box/box'
import ModalConnectionScanning from '../modal-connection/modal-connection-scanning'
import connectionStyles from '../modal-connection/modal-connection.module.css'
import radarIcon from '../modal-connection/searching.png'
import Modal from '../modal/modal'
import styles from './modal-board-list.module.css'

const messages = defineMessages({
  title: {
    defaultMessage: 'Connect a board',
    description: 'Title of the dialog that lists boards available to connect',
    id: 'gui.boardListDialog.title',
  },
  connecting: {
    defaultMessage: 'Connecting to {name}…',
    description: 'Text shown while connecting to the board picked from the list',
    id: 'gui.boardListDialog.connecting',
  },
  connectError: {
    defaultMessage: 'Couldn’t connect: {error}',
    description: 'Text shown above the board list when connecting to the picked board failed',
    id: 'gui.boardListDialog.connectError',
  },
})

interface ModalBoardListProps {
  /** The boards the last scan found; null before a scan has run. */
  boards: ConnectedBoard[] | null
  /** The message of the last connect that failed. */
  connectError: string | null
  /** The board being connected to. */
  connectingBoard: ConnectedBoard | null
  deviceIconURL?: string
  onCloseDialog: () => void
  onConnectBoard: (boardId: string) => void
  onScan: () => void
  scanning: boolean
}

/**
 * The boards plugged in for the selected device, to connect one. It shows them with the connection modal's scanning
 * step, so it looks like the peripheral connection.
 * @param props - The scan's state and boards, the connect in progress or its error, and the handlers.
 * @returns The modal with the boards, or with the connect in progress.
 */
const ModalBoardList = (props: ModalBoardListProps) => {
  const { boards, connectError, connectingBoard, deviceIconURL, onCloseDialog, onConnectBoard, onScan, scanning } =
    props
  const intl = useIntl()
  const peripheralList = (boards ?? []).map((board) => ({ peripheralId: board.id, name: board.name }))
  return (
    <Modal
      className={classNames(connectionStyles.modalContent, styles.modalContent)}
      contentLabel={intl.formatMessage(messages.title)}
      headerClassName={connectionStyles.header}
      id="boardListDialog"
      onRequestClose={onCloseDialog}
    >
      {connectingBoard ? (
        <Box className={connectionStyles.body}>
          <Box className={classNames(connectionStyles.activityArea, styles.activityArea)}>
            <div className={connectionStyles.centeredRow}>
              <img
                alt=""
                className={classNames(connectionStyles.radarSmall, connectionStyles.radarSpin)}
                src={radarIcon}
              />
              {intl.formatMessage(messages.connecting, { name: connectingBoard.name })}
            </div>
          </Box>
        </Box>
      ) : (
        <>
          {connectError && (
            <div className={styles.error}>{intl.formatMessage(messages.connectError, { error: connectError })}</div>
          )}
          <ModalConnectionScanning
            activityAreaClassName={styles.activityArea}
            bottomAreaClassName={styles.bottomArea}
            connectionSmallIconURL={deviceIconURL}
            peripheralList={peripheralList}
            peripheralTileClassName={styles.peripheralTile}
            // The step shows "No devices found" once its scan ends, but this scan is one-shot, so only a finished scan
            // with no boards counts as ended
            scanning={scanning || peripheralList.length > 0}
            showSignalStrength={false}
            showStepDots={false}
            onConnecting={onConnectBoard}
            onRefresh={onScan}
          />
        </>
      )}
    </Modal>
  )
}

export default ModalBoardList
