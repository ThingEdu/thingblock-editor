import classNames from 'classnames'
import { FormattedMessage } from 'react-intl'
import Box from '../box/box'
import backIcon from './back.svg'
import bluetoothIcon from './bluetooth.svg'
import helpIcon from './help.svg'
import ModalConnectionDots from './modal-connection-dots'
import styles from './modal-connection.module.css'
import thingblockLinkIcon from './thingblocklink.svg'

interface ModalConnectionUnavailableProps {
  /** Shows the Help button. */
  onHelp?: () => void
  onScanning: () => void
}

/**
 * The step shown when the scan could not start, as when ThingBlock Link is not running.
 * @param props - What trying again and help do.
 * @returns The two things to check, and buttons to try again or get help.
 */
const ModalConnectionUnavailable = (props: ModalConnectionUnavailableProps) => {
  const { onHelp, onScanning } = props
  return (
    <Box className={styles.body}>
      <Box className={styles.activityArea}>
        <div className={styles.scratchLinkHelp}>
          <div className={styles.scratchLinkHelpStep}>
            <div className={styles.helpStepNumber}>1</div>
            <div className={styles.helpStepImage}>
              <img alt="" className={styles.scratchLinkIcon} src={thingblockLinkIcon} />
            </div>
            <div>
              <FormattedMessage
                defaultMessage="Make sure you have ThingBlock Link installed and running"
                description="Message for getting ThingBlock Link installed"
                id="gui.connection.unavailable.installthingblocklink"
              />
            </div>
          </div>
          <div className={styles.scratchLinkHelpStep}>
            <div className={styles.helpStepNumber}>2</div>
            <div className={styles.helpStepImage}>
              <img alt="" className={styles.scratchLinkIcon} src={bluetoothIcon} />
            </div>
            <div>
              <FormattedMessage
                defaultMessage="Check that Bluetooth is enabled"
                description="Message for making sure Bluetooth is enabled"
                id="gui.connection.unavailable.enablebluetooth"
              />
            </div>
          </div>
        </div>
      </Box>
      <Box className={styles.bottomArea}>
        <ModalConnectionDots error className={styles.bottomAreaItem} total={3} />
        <Box className={classNames(styles.bottomAreaItem, styles.buttonRow)}>
          <button className={styles.connectionButton} type="button" onClick={onScanning}>
            <img alt="" className={classNames(styles.buttonIconLeft, styles.buttonIconBack)} src={backIcon} />
            <FormattedMessage
              defaultMessage="Try again"
              description="Button to initiate trying the device connection again after an error"
              id="gui.connection.unavailable.tryagainbutton"
            />
          </button>
          {onHelp && (
            <button className={styles.connectionButton} type="button" onClick={onHelp}>
              <img alt="" className={styles.buttonIconLeft} src={helpIcon} />
              <FormattedMessage
                defaultMessage="Help"
                description="Button to view help content"
                id="gui.connection.unavailable.helpbutton"
              />
            </button>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default ModalConnectionUnavailable
