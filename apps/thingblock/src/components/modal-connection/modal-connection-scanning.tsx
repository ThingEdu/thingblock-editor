import classNames from 'classnames'
import { FormattedMessage } from 'react-intl'
import Box from '../box/box'
import enterUpdateIcon from './enter-update.svg'
import ModalConnectionDots from './modal-connection-dots'
import ModalConnectionPeripheralTile from './modal-connection-peripheral-tile'
import styles from './modal-connection.module.css'
import refreshIcon from './refresh.svg'
import radarIcon from './searching.png'
import warningIcon from './warning.svg'

/** A device a scan found. */
export interface Peripheral {
  peripheralId: string
  name: string
  /** The signal strength in dBm. */
  rssi?: number
}

interface ModalConnectionScanningProps {
  activityAreaClassName?: string
  bottomAreaClassName?: string
  className?: string
  connectionSmallIconURL?: string
  onConnecting: (peripheralId: string) => void
  onRefresh: () => void
  /** Shows the "Update my Device" button and prompt. */
  onUpdatePeripheral?: () => void
  peripheralList: Peripheral[]
  peripheralTileClassName?: string
  /** Whether the scan is still running; a finished scan with no devices shows "No devices found". */
  scanning: boolean
  showSignalStrength?: boolean
  showStepDots?: boolean
}

/**
 * The devices a scan found, for the user to choose one. It runs no scan itself.
 * @param props - The devices, the scan's state, how to show them, and what choosing one and refreshing do.
 * @returns The list, or the scan's progress, above the instructions and the Refresh button.
 */
const ModalConnectionScanning = (props: ModalConnectionScanningProps) => {
  const {
    activityAreaClassName,
    bottomAreaClassName,
    className,
    connectionSmallIconURL,
    onConnecting,
    onRefresh,
    onUpdatePeripheral,
    peripheralList,
    peripheralTileClassName,
    scanning,
    showSignalStrength = true,
    showStepDots = true,
  } = props
  return (
    <Box className={classNames(styles.body, className)}>
      <Box className={classNames(styles.activityArea, activityAreaClassName)}>
        {scanning ? (
          peripheralList.length === 0 ? (
            <div className={styles.centeredRow}>
              <img alt="" className={classNames(styles.radarSmall, styles.radarSpin)} src={radarIcon} />
              <FormattedMessage
                defaultMessage="Looking for devices"
                description="Text shown while scanning for devices"
                id="gui.connection.scanning.lookingforperipherals"
              />
            </div>
          ) : (
            <div className={styles.peripheralTilePane}>
              {peripheralList.map((peripheral) => (
                <ModalConnectionPeripheralTile
                  key={peripheral.peripheralId}
                  className={peripheralTileClassName}
                  connectionSmallIconURL={connectionSmallIconURL}
                  name={peripheral.name}
                  peripheralId={peripheral.peripheralId}
                  rssi={peripheral.rssi}
                  showSignalStrength={showSignalStrength}
                  onConnecting={onConnecting}
                />
              ))}
            </div>
          )
        ) : (
          <Box className={styles.centeredRow}>
            <img alt="" className={styles.helpStepImage} src={warningIcon} />
            <FormattedMessage
              defaultMessage="No devices found"
              description="Text shown when no devices could be found"
              id="gui.connection.scanning.noPeripheralsFound"
            />
          </Box>
        )}
      </Box>
      <Box className={classNames(styles.bottomArea, bottomAreaClassName)}>
        <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
          {(scanning || peripheralList.length > 0) && (
            <FormattedMessage
              defaultMessage="Select your device in the list above."
              description="Prompt for choosing a device to connect to"
              id="gui.connection.scanning.instructions"
            />
          )}
          {onUpdatePeripheral && (
            // The list may hold devices but not the one wanted, so this shows with any list
            <div className={styles.balanced}>
              <FormattedMessage
                defaultMessage="If you don't see your device, you may need to update it."
                description="Prompt for updating a peripheral device"
                id="gui.connection.scanning.updatePeripheralPrompt"
              />
            </div>
          )}
        </Box>
        {showStepDots && <ModalConnectionDots className={styles.bottomAreaItem} counter={0} total={3} />}
        <Box className={classNames(styles.bottomAreaItem, styles.buttonRow)}>
          <button className={styles.connectionButton} type="button" onClick={onRefresh}>
            <FormattedMessage
              defaultMessage="Refresh"
              description="Button in prompt for starting a search"
              id="gui.connection.search"
            />
            <img alt="" className={styles.buttonIconRight} src={refreshIcon} />
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
        </Box>
      </Box>
    </Box>
  )
}

export default ModalConnectionScanning
