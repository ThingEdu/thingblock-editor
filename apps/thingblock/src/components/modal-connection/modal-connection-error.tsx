import classNames from 'classnames'
import { FormattedMessage } from 'react-intl'
import Box from '../box/box'
import backIcon from './back.svg'
import enterUpdateIcon from './enter-update.svg'
import helpIcon from './help.svg'
import ModalConnectionDots from './modal-connection-dots'
import styles from './modal-connection.module.css'

interface ModalConnectionErrorProps {
  connectionIconURL?: string
  /** Shows the Help button. */
  onHelp?: () => void
  onScanning: () => void
  /** Shows the "Update my Device" button. */
  onUpdatePeripheral?: () => void
}

/**
 * The step shown when connecting to the device failed.
 * @param props - The device's picture, and what trying again, updating and help do.
 * @returns The device, the error, and buttons to try again, update the device or get help.
 */
const ModalConnectionError = (props: ModalConnectionErrorProps) => {
  const { connectionIconURL, onHelp, onScanning, onUpdatePeripheral } = props
  return (
    <Box className={styles.body}>
      <Box className={styles.activityArea}>
        <Box className={styles.centeredRow}>
          <div className={styles.peripheralActivity}>
            {connectionIconURL && <img alt="" src={connectionIconURL} />}
          </div>
        </Box>
      </Box>
      <Box className={styles.bottomArea}>
        <div className={classNames(styles.bottomAreaItem, styles.instructions)}>
          <FormattedMessage
            defaultMessage="Oops, looks like something went wrong."
            description="The device connection process has encountered an error."
            id="gui.connection.error.errorMessage"
          />
        </div>
        <ModalConnectionDots error className={styles.bottomAreaItem} total={3} />
        <Box className={classNames(styles.bottomAreaItem, styles.buttonRow)}>
          <button className={styles.connectionButton} type="button" onClick={onScanning}>
            <img alt="" className={classNames(styles.buttonIconLeft, styles.buttonIconBack)} src={backIcon} />
            <FormattedMessage
              defaultMessage="Try again"
              description="Button to initiate trying the device connection again after an error"
              id="gui.connection.error.tryagainbutton"
            />
          </button>
          {onUpdatePeripheral && (
            <button className={styles.connectionButton} type="button" onClick={onUpdatePeripheral}>
              <FormattedMessage
                defaultMessage="Update my Device"
                description="Button to enter the peripheral update mode"
                id="gui.connection.scanning.updatePeripheralButton"
              />
              <img alt="" className={styles.buttonIconRight} src={enterUpdateIcon} />
            </button>
          )}
          {onHelp && (
            <button className={styles.connectionButton} type="button" onClick={onHelp}>
              <img alt="" className={styles.buttonIconLeft} src={helpIcon} />
              <FormattedMessage
                defaultMessage="Help"
                description="Button to view help content"
                id="gui.connection.error.helpbutton"
              />
            </button>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default ModalConnectionError
