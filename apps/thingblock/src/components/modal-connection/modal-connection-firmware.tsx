import type VM from '@thingblock/thingblock-vm'
import classNames from 'classnames'
import { useEffect, useRef, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import log from '../../lib/log'
import type { ConnectedBoard } from '../../reducers/board'
import Box from '../box/box'
import backIcon from './back.svg'
import ModalConnectionPeripheralTile from './modal-connection-peripheral-tile'
import styles from './modal-connection.module.css'
import refreshIcon from './refresh.svg'
import radarIcon from './searching.png'
import warningIcon from './warning.svg'

/**
 * Lists the USB ports a device's board may be on.
 * @param vm - The VM whose link helper lists them.
 * @param deviceId - The device whose boards to look for.
 * @returns The ports, or none when the helper could not list them.
 */
const listUsbPorts = (vm: VM, deviceId: string) =>
  vm.link.listBoards(deviceId).catch((err: unknown) => {
    log.warn(`ModalConnectionFirmware: listBoards failed: ${String(err)}`)
    return []
  })

type Status = 'listing' | 'ports' | 'connecting' | 'flashing' | 'done' | 'error'

interface ModalConnectionFirmwareProps {
  connectionSmallIconURL?: string
  /** The device pack and its firmware image to install. */
  firmware: { deviceId: string; firmwareId: string }
  onScanning: () => void
}

/**
 * Installs the extension's live-mode firmware over USB through the link helper. The live connection itself runs over
 * Bluetooth, so this step picks a USB port of its own.
 * @param props - The firmware to install, the icon for the ports, and what going back to the scan does.
 * @returns The USB ports to install on, or the install's progress and outcome.
 */
const ModalConnectionFirmware = (props: ModalConnectionFirmwareProps) => {
  const { connectionSmallIconURL, firmware, onScanning } = props
  const vm = useVm()
  const connectedBoard = useAppSelector((state) => state.scratchGui.board.connectedBoard)
  // A board already connected over USB is the only target; otherwise the ports matching the device are listed
  const [status, setStatus] = useState<Status>(connectedBoard ? 'ports' : 'listing')
  const [ports, setPorts] = useState<ConnectedBoard[]>(connectedBoard ? [connectedBoard] : [])
  const [error, setError] = useState('')
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const showPorts = (found: ConnectedBoard[]) => {
    if (!mounted.current) return
    setPorts(found)
    setStatus('ports')
  }

  useEffect(() => {
    if (!connectedBoard) void listUsbPorts(vm, firmware.deviceId).then(showPorts)
  }, [connectedBoard, firmware.deviceId, vm])

  const listPorts = () => {
    if (connectedBoard) {
      showPorts([connectedBoard])
      return
    }
    setStatus('listing')
    void listUsbPorts(vm, firmware.deviceId).then(showPorts)
  }

  const handleInstall = (portId: string) => {
    const port = ports.find((candidate) => candidate.id === portId)
    if (!port) throw new Error(`ModalConnectionFirmware: no port ${portId}`)
    // Only a port this step opened is released afterwards
    const ownsPort = !connectedBoard
    setStatus(ownsPort ? 'connecting' : 'flashing')
    void (ownsPort ? vm.link.connectBoard(firmware.deviceId, port) : Promise.resolve())
      .then(() => {
        if (mounted.current) setStatus('flashing')
        return vm.link.flashFirmware(firmware.deviceId, firmware.firmwareId)
      })
      .then(() => {
        if (mounted.current) setStatus('done')
      })
      .catch((err: unknown) => {
        if (!mounted.current) return
        if ((err as { code?: string } | null)?.code === 'cancelled') {
          listPorts()
          return
        }
        setError(err instanceof Error ? err.message : '')
        setStatus('error')
      })
      .finally(() => {
        if (!ownsPort) return
        vm.link.disconnectBoard().catch((err: unknown) => {
          log.warn(`ModalConnectionFirmware: disconnectBoard failed: ${String(err)}`)
        })
      })
  }

  const busy = status === 'listing' || status === 'connecting' || status === 'flashing'
  return (
    <Box className={styles.body}>
      <Box className={styles.activityArea}>
        {status === 'ports' && ports.length > 0 ? (
          <div className={styles.peripheralTilePane}>
            {ports.map((port) => (
              <ModalConnectionPeripheralTile
                key={port.id}
                actionLabel={
                  <FormattedMessage
                    defaultMessage="Install"
                    description="Button that installs the live-mode firmware on a USB board"
                    id="gui.connection.firmware.install"
                  />
                }
                connectionSmallIconURL={connectionSmallIconURL}
                name={port.name}
                peripheralId={port.id}
                showSignalStrength={false}
                onConnecting={handleInstall}
              />
            ))}
          </div>
        ) : (
          <div className={styles.centeredRow}>
            {busy && <img alt="" className={classNames(styles.radarSmall, styles.radarSpin)} src={radarIcon} />}
            {(status === 'ports' || status === 'error') && (
              <img alt="" className={styles.helpStepImage} src={warningIcon} />
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
            {status === 'connecting' && (
              <FormattedMessage
                defaultMessage="Connecting to the board…"
                description="Text shown while connecting to the USB board to install firmware on"
                id="gui.connection.firmware.connecting"
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
                values={{ error }}
              />
            )}
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
            <>
              <button className={styles.connectionButton} type="button" onClick={onScanning}>
                <img alt="" className={classNames(styles.buttonIconLeft, styles.buttonIconBack)} src={backIcon} />
                <FormattedMessage
                  defaultMessage="Back"
                  description="Button that leaves the firmware install and returns to the device scan"
                  id="gui.connection.firmware.back"
                />
              </button>
              <button className={styles.connectionButton} type="button" onClick={listPorts}>
                <FormattedMessage
                  defaultMessage="Refresh"
                  description="Button in prompt for starting a search"
                  id="gui.connection.search"
                />
                <img alt="" className={styles.buttonIconRight} src={refreshIcon} />
              </button>
            </>
          )}
          {status === 'flashing' && (
            <button
              className={styles.connectionButton}
              type="button"
              onClick={() => {
                vm.link.cancelUpload()
              }}
            >
              <FormattedMessage
                defaultMessage="Stop"
                description="Button that aborts the in-progress firmware install"
                id="gui.connection.firmware.stop"
              />
            </button>
          )}
          {status === 'done' && (
            <button className={styles.connectionButton} type="button" onClick={onScanning}>
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
  )
}

export default ModalConnectionFirmware
