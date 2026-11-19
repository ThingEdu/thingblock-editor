import classNames from 'classnames'
import { type ReactNode, useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { useVm } from '../../hooks/use-vm'
import Box from '../box/box'
import closeIcon from '../button-close/icon--close.svg'
import backIcon from './back.svg'
import bluetoothIcon from './bluetooth-white.svg'
import enterUpdateIcon from './enter-update.svg'
import ModalConnectionDots from './modal-connection-dots'
import type { Peripheral } from './modal-connection-scanning'
import styles from './modal-connection.module.css'
import radarIcon from './searching.png'
import warningIcon from './warning.svg'

type Phase = 'prescan' | 'pressbutton' | 'notfound'

interface ModalConnectionAutoScanningProps {
  connectionIconURL?: string
  connectionTipIconURL?: string
  extensionId: string
  onConnecting: (peripheralId: string) => void
  /** Shows the "Update my Device" button, hint and prompt. */
  onUpdatePeripheral?: () => void
  prescanMessage?: ReactNode
  scanBeginMessage?: ReactNode
}

/**
 * Scans for the extension's device and connects to the first one found. The user starts the scan, after a message
 * like "Have your device nearby", then sees one like "Press the button on your device" until a device turns up; with
 * an external device list, such as the browser's Bluetooth chooser, that is the one the user picked there.
 * @param props - The extension, its messages and icons, and what connecting and updating the device do.
 * @returns The step's picture, messages and buttons for its phase.
 */
const ModalConnectionAutoScanning = (props: ModalConnectionAutoScanningProps) => {
  const {
    connectionIconURL,
    connectionTipIconURL,
    extensionId,
    onConnecting,
    onUpdatePeripheral,
    prescanMessage = (
      <FormattedMessage
        defaultMessage="Have your device nearby, then begin searching."
        description="Prompt for beginning the search"
        id="gui.connection.auto-scanning.prescan"
      />
    ),
    scanBeginMessage = (
      <FormattedMessage
        defaultMessage="Press the button on your device."
        description="Prompt for pushing the button on the device"
        id="gui.connection.auto-scanning.scanBeginMessage"
      />
    ),
  } = props
  const vm = useVm()
  const [phase, setPhase] = useState<Phase>('prescan')

  useEffect(() => {
    if (phase !== 'pressbutton') return
    const handleListUpdate = (list: Record<string, Peripheral>) => {
      const peripherals = Object.values(list)
      if (peripherals.length > 0) onConnecting(peripherals[0].peripheralId)
    }
    const handleScanTimeout = () => {
      setPhase('notfound')
    }
    vm.events.on('PERIPHERAL_LIST_UPDATE', handleListUpdate)
    vm.events.on('PERIPHERAL_SCAN_TIMEOUT', handleScanTimeout)
    // The user picked the device outside this modal, so the list holds that one device, or none if they cancelled,
    // which is what a list update means here too
    vm.events.on('USER_PICKED_PERIPHERAL', handleListUpdate)
    return () => {
      vm.events.off('PERIPHERAL_LIST_UPDATE', handleListUpdate)
      vm.events.off('PERIPHERAL_SCAN_TIMEOUT', handleScanTimeout)
      vm.events.off('USER_PICKED_PERIPHERAL', handleListUpdate)
    }
  }, [onConnecting, phase, vm])

  const handleStartScan = () => {
    vm.scanForPeripheral(extensionId)
    setPhase('pressbutton')
  }
  const handleRefresh = () => {
    setPhase('prescan')
  }

  // The update button shows from the start, as a device without the right firmware never turns up in a scan; the
  // prompt waits for a scan, since only then can the device be missing from it
  return (
    <Box className={styles.body}>
      <Box className={styles.activityArea}>
        <div className={styles.centeredRow}>
          {phase === 'prescan' &&
            (connectionIconURL ? (
              <img alt="" className={styles.radarBig} src={connectionIconURL} />
            ) : (
              <>
                <img alt="" className={styles.radarBig} src={radarIcon} />
                <img alt="" className={styles.bluetoothCenteredIcon} src={bluetoothIcon} />
              </>
            ))}
          {phase === 'pressbutton' && (
            <>
              <img alt="" className={classNames(styles.radarBig, styles.radarSpin)} src={radarIcon} />
              {connectionTipIconURL && <img alt="" className={styles.connectionTipIcon} src={connectionTipIconURL} />}
            </>
          )}
          {phase === 'notfound' && (
            <>
              <img alt="" className={styles.helpStepImage} src={warningIcon} />
              <FormattedMessage
                defaultMessage="No devices found"
                description="Text shown when no devices could be found"
                id="gui.connection.auto-scanning.noPeripheralsFound"
              />
            </>
          )}
        </div>
      </Box>
      <Box className={styles.bottomArea}>
        <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
          {phase === 'prescan' && prescanMessage}
          {phase === 'pressbutton' && scanBeginMessage}
        </Box>
        {onUpdatePeripheral && phase === 'prescan' && (
          <Box className={classNames(styles.bottomAreaItem, styles.instructions, styles.hint)}>
            <FormattedMessage
              defaultMessage="Use Update my Device to install its firmware over USB."
              description="Hint shown before searching, explaining the Update my Device button"
              id="gui.connection.auto-scanning.updatePeripheralHint"
            />
          </Box>
        )}
        {onUpdatePeripheral && phase !== 'prescan' && (
          <Box className={classNames(styles.bottomAreaItem, styles.instructions, styles.balanced)}>
            <FormattedMessage
              defaultMessage="If you don't see your device, you may need to update it."
              description="Prompt for updating a peripheral device"
              id="gui.connection.auto-scanning.updatePeripheralPrompt"
            />
          </Box>
        )}
        <ModalConnectionDots className={styles.bottomAreaItem} counter={0} total={3} />
        <Box className={classNames(styles.bottomAreaItem, styles.buttonRow)}>
          {phase === 'prescan' && (
            <button className={styles.connectionButton} type="button" onClick={handleStartScan}>
              <FormattedMessage
                defaultMessage="Start Searching"
                description="Button in prompt for starting a search"
                id="gui.connection.auto-scanning.start-search"
              />
            </button>
          )}
          {phase === 'pressbutton' && (
            <div className={styles.segmentedButton}>
              <button disabled className={styles.connectionButton} type="button">
                <FormattedMessage
                  defaultMessage="Searching..."
                  description="Label indicating that search is in progress"
                  id="gui.connection.connecting-searchbutton"
                />
              </button>
              <button className={styles.connectionButton} type="button" onClick={handleRefresh}>
                <img alt="" className={styles.abortConnectingIcon} src={closeIcon} />
              </button>
            </div>
          )}
          {phase === 'notfound' && (
            <button className={styles.connectionButton} type="button" onClick={handleRefresh}>
              <img alt="" className={styles.buttonIconLeft} src={backIcon} />
              <FormattedMessage
                defaultMessage="Try again"
                description="Button in prompt for trying a device search again"
                id="gui.connection.auto-scanning.try-again"
              />
            </button>
          )}
          {onUpdatePeripheral && (
            <button
              className={classNames(styles.bottomAreaItem, styles.connectionButton)}
              type="button"
              onClick={onUpdatePeripheral}
            >
              <FormattedMessage
                defaultMessage="Update my Device"
                description="Button to enter the peripheral update mode"
                id="gui.connection.auto-scanning.updatePeripheralButton"
              />
              <img alt="" className={styles.buttonIconRight} src={enterUpdateIcon} />
            </button>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default ModalConnectionAutoScanning
