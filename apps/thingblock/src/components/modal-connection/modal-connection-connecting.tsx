import classNames from 'classnames'
import type { ReactNode } from 'react'
import { FormattedMessage } from 'react-intl'
import Box from '../box/box'
import closeIcon from '../button-close/icon--close.svg'
import bluetoothIcon from './bluetooth-white.svg'
import ModalConnectionDots from './modal-connection-dots'
import styles from './modal-connection.module.css'

interface ModalConnectionConnectingProps {
  connectingMessage?: ReactNode
  connectionIconURL?: string
  onDisconnect: () => void
}

/**
 * The step shown while the device connects.
 * @param props - The device's picture and message, and what stopping does.
 * @returns The device with a wiggling Bluetooth badge, the message, and a button that stops connecting.
 */
const ModalConnectionConnecting = (props: ModalConnectionConnectingProps) => {
  const { connectingMessage, connectionIconURL, onDisconnect } = props
  return (
    <Box className={styles.body}>
      <Box className={styles.activityArea}>
        <Box className={styles.centeredRow}>
          <div className={styles.peripheralActivity}>
            {connectionIconURL && <img alt="" src={connectionIconURL} />}
            <img alt="" className={styles.bluetoothConnectingIcon} src={bluetoothIcon} />
          </div>
        </Box>
      </Box>
      <Box className={styles.bottomArea}>
        <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>{connectingMessage}</Box>
        <ModalConnectionDots className={styles.bottomAreaItem} counter={1} total={3} />
        <div className={classNames(styles.bottomAreaItem, styles.segmentedButton)}>
          <button disabled className={styles.connectionButton} type="button">
            <FormattedMessage
              defaultMessage="Connecting..."
              description="Label indicating that connection is in progress"
              id="gui.connection.connecting-cancelbutton"
            />
          </button>
          <button className={styles.connectionButton} type="button" onClick={onDisconnect}>
            <img alt="" className={styles.abortConnectingIcon} src={closeIcon} />
          </button>
        </div>
      </Box>
    </Box>
  )
}

export default ModalConnectionConnecting
