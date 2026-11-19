import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import extensions from '../../lib/extensions'
import { closeConnectionModal } from '../../reducers/modals'
import Box from '../box/box'
import Modal from '../modal/modal'
import ModalConnectionAutoScanning from './modal-connection-auto-scanning'
import ModalConnectionConnected from './modal-connection-connected'
import ModalConnectionConnecting from './modal-connection-connecting'
import ModalConnectionError from './modal-connection-error'
import ModalConnectionFirmware from './modal-connection-firmware'
import ModalConnectionScanning, { type Peripheral } from './modal-connection-scanning'
import ModalConnectionUnavailable from './modal-connection-unavailable'
import styles from './modal-connection.module.css'

type Phase = 'scanning' | 'connecting' | 'connected' | 'error' | 'unavailable' | 'firmware'

interface ModalConnectionProps {
  /** The host shows its own device chooser, as Android's companion device manager does. */
  useExternalPeripheralList?: boolean
}

interface ConnectionFlowProps extends ModalConnectionProps {
  extensionId: string
}

/**
 * The connection to the device of the extension in the store, while its modal is open.
 * @param props - Whether the host shows its own device chooser.
 * @returns The modal, or nothing while it is closed.
 */
const ModalConnection = (props: ModalConnectionProps) => {
  const visible = useAppSelector((state) => state.scratchGui.modals.connectionModal)
  const extensionId = useAppSelector((state) => state.scratchGui.connectionModal.extensionId)
  if (!visible) return null
  if (!extensionId) throw new Error('ModalConnection: the modal is open with no extension')
  return <ConnectionFlow extensionId={extensionId} useExternalPeripheralList={props.useExternalPeripheralList} />
}

/**
 * The modal's steps, from scanning for the device to connecting to it. Rendered only while the modal is open, so
 * each opening starts afresh.
 * @param props - The extension, and whether the host shows its own device chooser.
 * @returns The modal, showing the step of the connection's phase.
 */
const ConnectionFlow = (props: ConnectionFlowProps) => {
  const { extensionId, useExternalPeripheralList = false } = props
  const vm = useVm()
  const dispatch = useAppDispatch()
  const extension = extensions.find((ext) => ext.extensionId === extensionId)
  const [phase, setPhase] = useState<Phase>(() =>
    vm.getPeripheralIsConnected(extensionId) ? 'connected' : 'scanning',
  )
  const [scanning, setScanning] = useState(true)
  const [peripheralList, setPeripheralList] = useState<Peripheral[]>([])

  // Web Bluetooth picks the device in the browser's own chooser, so it counts as an external list, detected as the
  // VM picks its Bluetooth backend
  const externalList = useExternalPeripheralList || Boolean((navigator as { bluetooth?: unknown }).bluetooth)
  // The auto-scanning step connects to the first device found, which with an external list is the one picked there
  const autoScan = Boolean(extension?.useAutoScan) || externalList
  const listScanning = phase === 'scanning' && !autoScan

  const handleConnecting = (peripheralId: string) => {
    vm.connectPeripheral(extensionId, peripheralId)
    setPhase('connecting')
  }

  useEffect(() => {
    const handleConnected = () => {
      setPhase('connected')
    }
    // An error while scanning is taken to mean ThingBlock Link is not running
    const handleError = () => {
      setPhase((current) => (current === 'scanning' || current === 'unavailable' ? 'unavailable' : 'error'))
    }
    vm.events.on('PERIPHERAL_CONNECTED', handleConnected)
    vm.events.on('PERIPHERAL_REQUEST_ERROR', handleError)
    return () => {
      vm.events.off('PERIPHERAL_CONNECTED', handleConnected)
      vm.events.off('PERIPHERAL_REQUEST_ERROR', handleError)
    }
  }, [vm])

  // The scanning list's scan: it runs each time the list shows, until a device is picked or the scan times out
  useEffect(() => {
    if (!listScanning) return
    const handleListUpdate = (list: Record<string, Peripheral>) => {
      setPeripheralList(Object.values(list))
    }
    const handleScanTimeout = () => {
      setScanning(false)
      setPeripheralList([])
    }
    const handleUserPicked = (list: Record<string, Peripheral>) => {
      const picked = Object.values(list)
      setPeripheralList(picked)
      if (picked.length > 0) {
        vm.connectPeripheral(extensionId, picked[0].peripheralId)
        setPhase('connecting')
      }
    }
    vm.scanForPeripheral(extensionId)
    vm.events.on('PERIPHERAL_LIST_UPDATE', handleListUpdate)
    vm.events.on('PERIPHERAL_SCAN_TIMEOUT', handleScanTimeout)
    vm.events.on('USER_PICKED_PERIPHERAL', handleUserPicked)
    return () => {
      vm.events.off('PERIPHERAL_LIST_UPDATE', handleListUpdate)
      vm.events.off('PERIPHERAL_SCAN_TIMEOUT', handleScanTimeout)
      vm.events.off('USER_PICKED_PERIPHERAL', handleUserPicked)
    }
  }, [extensionId, listScanning, vm])

  const handleScanning = () => {
    setScanning(true)
    setPeripheralList([])
    setPhase('scanning')
  }
  const handleRefresh = () => {
    vm.scanForPeripheral(extensionId)
    setScanning(true)
    setPeripheralList([])
  }
  const handleDisconnect = () => {
    try {
      vm.disconnectPeripheral(extensionId)
    } finally {
      dispatch(closeConnectionModal())
    }
  }
  const handleCancel = () => {
    try {
      // Closing the connection stops the scan when no device is connected yet
      if (!vm.getPeripheralIsConnected(extensionId)) vm.disconnectPeripheral(extensionId)
    } finally {
      dispatch(closeConnectionModal())
    }
  }
  const helpLink = extension?.helpLink
  const handleHelp = helpLink
    ? () => {
        window.open(helpLink, '_blank')
      }
    : undefined

  // The firmware install is offered only when the pack ships the image and the link client can flash it
  const firmware = extension?.firmware
  const canInstallFirmware = Boolean(
    firmware &&
    vm.link.backend.flasher.canFlashFirmware &&
    vm.devices.getDeviceFirmware(firmware.deviceId).some((image) => image.id === firmware.firmwareId),
  )
  const handleFirmware = canInstallFirmware
    ? () => {
        setPhase('firmware')
      }
    : undefined

  return (
    <Modal
      className={styles.modalContent}
      contentLabel={extension?.name ?? extensionId}
      headerClassName={styles.header}
      headerImage={extension?.connectionSmallIconURL}
      id="connectionModal"
      onHelp={handleHelp}
      onRequestClose={handleCancel}
    >
      <Box className={styles.body}>
        {phase === 'scanning' &&
          (autoScan ? (
            <ModalConnectionAutoScanning
              connectionIconURL={extension?.connectionIconURL}
              connectionTipIconURL={extension?.connectionTipIconURL}
              extensionId={extensionId}
              prescanMessage={extension?.prescanMessage}
              scanBeginMessage={extension?.scanBeginMessage}
              onConnecting={handleConnecting}
              onUpdatePeripheral={handleFirmware}
            />
          ) : (
            <ModalConnectionScanning
              connectionSmallIconURL={extension?.connectionSmallIconURL}
              peripheralList={peripheralList}
              scanning={scanning}
              onConnecting={handleConnecting}
              onRefresh={handleRefresh}
              onUpdatePeripheral={handleFirmware}
            />
          ))}
        {phase === 'connecting' && (
          <ModalConnectionConnecting
            connectingMessage={extension?.connectingMessage}
            connectionIconURL={extension?.connectionIconURL}
            onDisconnect={handleDisconnect}
          />
        )}
        {phase === 'connected' && (
          <ModalConnectionConnected
            connectionIconURL={extension?.connectionIconURL}
            onCancel={handleCancel}
            onDisconnect={handleDisconnect}
          />
        )}
        {phase === 'error' && (
          <ModalConnectionError
            connectionIconURL={extension?.connectionIconURL}
            onHelp={handleHelp}
            onScanning={handleScanning}
            onUpdatePeripheral={handleFirmware}
          />
        )}
        {phase === 'unavailable' && <ModalConnectionUnavailable onHelp={handleHelp} onScanning={handleScanning} />}
        {phase === 'firmware' && firmware && (
          <ModalConnectionFirmware
            connectionSmallIconURL={extension.connectionSmallIconURL}
            firmware={firmware}
            onScanning={handleScanning}
          />
        )}
      </Box>
    </Modal>
  )
}

export default ModalConnection
