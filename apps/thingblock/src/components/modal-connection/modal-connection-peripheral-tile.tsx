import classNames from 'classnames'
import type { ReactNode } from 'react'
import { FormattedMessage } from 'react-intl'
import Box from '../box/box'
import styles from './modal-connection.module.css'

interface ModalConnectionPeripheralTileProps {
  /** The button's label, "Connect" by default. */
  actionLabel?: ReactNode
  className?: string
  connectionSmallIconURL?: string
  name: string
  onConnecting: (peripheralId: string) => void
  peripheralId: string
  /** The signal strength in dBm, shown as four bars. */
  rssi?: number
  showSignalStrength?: boolean
}

/**
 * A found device, with a button that connects to it.
 * @param props - The device, how to show it, and what its button does.
 * @returns A row with the device's icon and name, its signal strength, and the button.
 */
const ModalConnectionPeripheralTile = (props: ModalConnectionPeripheralTileProps) => {
  const {
    actionLabel,
    className,
    connectionSmallIconURL,
    name,
    onConnecting,
    peripheralId,
    rssi = -Infinity,
    showSignalStrength = true,
  } = props
  return (
    <Box className={classNames(styles.peripheralTile, className)}>
      <Box className={styles.peripheralTileName}>
        <img alt="" className={styles.peripheralTileImage} src={connectionSmallIconURL} />
        <Box className={styles.peripheralTileNameWrapper}>
          <Box className={styles.peripheralTileNameLabel}>
            <FormattedMessage
              defaultMessage="Device name"
              description="Label for field showing the device name"
              id="gui.connection.peripheral-name-label"
            />
          </Box>
          <Box className={styles.peripheralTileNameText}>{name}</Box>
        </Box>
      </Box>
      <Box className={styles.peripheralTileWidgets}>
        {showSignalStrength && (
          <Box className={styles.signalStrengthMeter}>
            {[-80, -60, -40, -20].map((threshold) => (
              <div
                key={threshold}
                className={classNames(styles.signalBar, { [styles.greenBar]: rssi > threshold })}
              />
            ))}
          </Box>
        )}
        <button
          type="button"
          onClick={() => {
            onConnecting(peripheralId)
          }}
        >
          {actionLabel ?? (
            <FormattedMessage
              defaultMessage="Connect"
              description="Button to start connecting to a specific device"
              id="gui.connection.connect"
            />
          )}
        </button>
      </Box>
    </Box>
  )
}

export default ModalConnectionPeripheralTile
