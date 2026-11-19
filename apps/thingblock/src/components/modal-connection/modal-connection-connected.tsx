import classNames from 'classnames'
import { FormattedMessage } from 'react-intl'
import Box from '../box/box'
import bluetoothIcon from './bluetooth-white.svg'
import ModalConnectionDots from './modal-connection-dots'
import styles from './modal-connection.module.css'

interface ModalConnectionConnectedProps {
  connectionIconURL?: string
  onCancel: () => void
  onDisconnect: () => void
}

/**
 * The step shown once the device is connected.
 * @param props - The device's picture, and what the two buttons do.
 * @returns The device with a green Bluetooth badge, and buttons to disconnect or go back to the editor.
 */
const ModalConnectionConnected = (props: ModalConnectionConnectedProps) => {
  const { connectionIconURL, onCancel, onDisconnect } = props
  return (
    <Box className={styles.body}>
      <Box className={styles.activityArea}>
        <Box className={styles.centeredRow}>
          <div className={styles.peripheralActivity}>
            {connectionIconURL && <img alt="" src={connectionIconURL} />}
            <img alt="" className={styles.bluetoothConnectedIcon} src={bluetoothIcon} />
          </div>
        </Box>
      </Box>
      <Box className={styles.bottomArea}>
        <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
          <FormattedMessage
            defaultMessage="Connected"
            description="Message indicating that a device was connected"
            id="gui.connection.connected"
          />
        </Box>
        <ModalConnectionDots success className={styles.bottomAreaItem} total={3} />
        <div className={classNames(styles.bottomAreaItem, styles.cornerButtons)}>
          <button
            className={classNames(styles.redButton, styles.connectionButton)}
            type="button"
            onClick={onDisconnect}
          >
            <FormattedMessage
              defaultMessage="Disconnect"
              description="Button to disconnect the device"
              id="gui.connection.disconnect"
            />
          </button>
          <button className={styles.connectionButton} type="button" onClick={onCancel}>
            <FormattedMessage
              defaultMessage="Go to Editor"
              description="Button to return to the editor"
              id="gui.connection.go-to-editor"
            />
          </button>
        </div>
      </Box>
    </Box>
  )
}

export default ModalConnectionConnected
