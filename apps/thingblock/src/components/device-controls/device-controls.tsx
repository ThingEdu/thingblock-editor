import classNames from 'classnames'
import { useEffect, useRef, useState } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import { flushGeneratedCode } from '../../lib/blocks/code-flush'
import log from '../../lib/log'
import { type ConnectedBoard, setConnectedBoard } from '../../reducers/board'
import ModalBoardList from '../modal-board-list/modal-board-list'
import ModalUpload, { type UploadProgress, type UploadStatus } from '../modal-upload/modal-upload'
import styles from './device-controls.module.css'
import greenFlagIcon from './icon--green-flag.svg'
import stopAllIcon from './icon--stop-all.svg'

const messages = defineMessages({
  run: {
    defaultMessage: 'Run',
    description: 'Button to start running the project',
    id: 'gui.deviceControls.run',
  },
  stop: {
    defaultMessage: 'Stop',
    description: 'Button to stop the running project',
    id: 'gui.deviceControls.stop',
  },
  upload: {
    defaultMessage: 'Upload',
    description: 'Button to upload the project to the selected board',
    id: 'gui.deviceControls.upload',
  },
  connect: {
    defaultMessage: 'Connect',
    description: 'Button to open the dialog that scans for connected boards',
    id: 'gui.deviceControls.connect',
  },
  disconnect: {
    defaultMessage: 'Disconnect',
    description: 'Button to disconnect the currently connected board',
    id: 'gui.deviceControls.disconnect',
  },
})

interface Upload {
  status: UploadStatus
  progress: UploadProgress | null
  logs: string[]
  error: string | null
}

/**
 * The buttons that run the project, or, with a board selected, connect the board and upload the project to it.
 * @returns The Connect or Disconnect button, the Run, Stop or Upload button, and the dialogs they open.
 */
const DeviceControls = () => {
  const intl = useIntl()
  const vm = useVm()
  const dispatch = useAppDispatch()
  const connectedBoard = useAppSelector((state) => state.scratchGui.board.connectedBoard)
  const selectedDeviceId = useAppSelector((state) => state.scratchGui.board.selectedDeviceId)
  const generatedCode = useAppSelector((state) => state.scratchGui.code.generatedCode)
  const projectRunning = useAppSelector((state) => state.scratchGui.vmStatus.running)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [boards, setBoards] = useState<ConnectedBoard[] | null>(null)
  const [connectingBoard, setConnectingBoard] = useState<ConnectedBoard | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  // The upload the upload modal shows; null while it is closed
  const [upload, setUpload] = useState<Upload | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    // The link drops when the user disconnects and when the helper crashes; the VM signals both with this event
    const handleDeviceDisconnected = () => {
      dispatch(setConnectedBoard(null))
    }
    vm.events.on('DEVICE_DISCONNECTED', handleDeviceDisconnected)
    return () => {
      mounted.current = false
      vm.events.off('DEVICE_DISCONNECTED', handleDeviceDisconnected)
    }
  }, [dispatch, vm])

  // Connecting, scanning and uploading are offered only with a board selected
  const deviceId = () => {
    if (!selectedDeviceId) throw new Error('DeviceControls: no board is selected')
    return selectedDeviceId
  }

  const handleScan = () => {
    setScanning(true)
    setConnectError(null)
    vm.link
      .listBoards(deviceId())
      .then((found) => {
        if (!mounted.current) return
        setScanning(false)
        setBoards(found)
      })
      .catch((error: unknown) => {
        if (!mounted.current) return
        // The scanning step has no error view, so an unreachable helper shows as "No devices found"
        log.warn(`DeviceControls: listBoards failed: ${String(error)}`)
        setScanning(false)
        setBoards([])
      })
  }

  const handleConnect = () => {
    setDialogOpen(true)
    setBoards(null)
    handleScan()
  }

  const handleConnectBoard = (boardId: string) => {
    const board = boards?.find((candidate) => candidate.id === boardId)
    if (!board) throw new Error(`DeviceControls: no board ${boardId} in the scan`)
    setConnectingBoard(board)
    setConnectError(null)
    vm.link
      .connectBoard(deviceId(), board)
      .then(() => {
        if (!mounted.current) return
        dispatch(setConnectedBoard(board))
        setDialogOpen(false)
        setConnectingBoard(null)
      })
      .catch((error: unknown) => {
        if (!mounted.current) return
        // Back to the list with the error, to retry or pick another board
        setConnectingBoard(null)
        setConnectError(error instanceof Error ? error.message : String(error))
      })
  }

  const handleUpload = () => {
    // Uploading flashes the connected board, so without one this opens the scan, and the user uploads again after
    if (!connectedBoard) {
      handleConnect()
      return
    }
    const device = deviceId()
    // An edit just before the click may not have reached the code view yet
    const code = flushGeneratedCode()?.generatedCode ?? generatedCode
    if (!code.trim()) {
      log.warn('DeviceControls: no generated code to upload')
      return
    }
    setUpload({ status: 'compiling', progress: null, logs: [], error: null })
    const update = (change: (current: Upload) => Partial<Upload>) => {
      if (!mounted.current) return
      setUpload((current) => current && { ...current, ...change(current) })
    }
    const onLog = (chunk: string) => {
      update((current) => ({ logs: [...current.logs, chunk] }))
    }
    vm.link
      .compile(device, code, {
        onLog,
        onProgress: (progress) => {
          update(() => ({ progress }))
        },
      })
      .then((artifact) => {
        if (!mounted.current) return
        update(() => ({ status: 'uploading', progress: null }))
        return vm.link.upload(device, artifact, { onLog })
      })
      .then(() => {
        update(() => ({ status: 'done' }))
      })
      .catch((error: unknown) => {
        // Stopping rejects the compile or upload with the helper's `cancelled` code
        if ((error as { code?: string } | null)?.code === 'cancelled') {
          update(() => ({ status: 'cancelled' }))
          return
        }
        update(() => ({ status: 'error', error: error instanceof Error ? error.message : String(error) }))
      })
  }

  const hasSelectedDevice = selectedDeviceId !== null
  const uploading = upload?.status === 'compiling' || upload?.status === 'uploading'
  const isStopButton = !hasSelectedDevice && projectRunning
  const label = isStopButton ? messages.stop : hasSelectedDevice ? messages.upload : messages.run
  const handlePrimary = () => {
    if (isStopButton) {
      vm.stopAll()
    } else if (hasSelectedDevice) {
      handleUpload()
    } else {
      if (!projectRunning) vm.start()
      vm.greenFlag()
    }
  }
  const selectedDevice = selectedDeviceId
    ? (vm.devices.getDeviceList({ includeHidden: true }) as { deviceId: string; iconURL?: string }[]).find(
        (device) => device.deviceId === selectedDeviceId,
      )
    : undefined

  return (
    <div className={styles.controlsHeader}>
      {hasSelectedDevice &&
        (connectedBoard ? (
          <button
            aria-label={intl.formatMessage(messages.disconnect)}
            className={styles.connectButton}
            disabled={uploading}
            title={connectedBoard.name}
            type="button"
            onClick={() => {
              // The connected board clears on the DEVICE_DISCONNECTED event, which a helper crash raises too
              void vm.link.disconnectBoard()
            }}
          >
            {intl.formatMessage(messages.disconnect)}
          </button>
        ) : (
          <button
            aria-label={intl.formatMessage(messages.connect)}
            className={styles.connectButton}
            disabled={uploading}
            type="button"
            onClick={handleConnect}
          >
            {intl.formatMessage(messages.connect)}
          </button>
        ))}
      <button
        aria-label={intl.formatMessage(label)}
        className={classNames(styles.primaryButton, {
          [styles.uploadButton]: hasSelectedDevice,
          [styles.stopButton]: isStopButton,
        })}
        disabled={uploading}
        type="button"
        onClick={handlePrimary}
      >
        <img
          alt=""
          className={styles.primaryIcon}
          draggable={false}
          height="20"
          src={isStopButton ? stopAllIcon : greenFlagIcon}
          width="20"
        />
        <span>{intl.formatMessage(label)}</span>
      </button>
      {dialogOpen && (
        <ModalBoardList
          boards={boards}
          connectError={connectError}
          connectingBoard={connectingBoard}
          deviceIconURL={selectedDevice?.iconURL}
          scanning={scanning}
          onCloseDialog={() => {
            setDialogOpen(false)
          }}
          onConnectBoard={handleConnectBoard}
          onScan={handleScan}
        />
      )}
      {upload && (
        <ModalUpload
          error={upload.error}
          logs={upload.logs}
          progress={upload.progress}
          status={upload.status}
          onCancel={() => {
            // The stopped compile or upload rejects, which shows as cancelled
            vm.link.cancelUpload()
          }}
          onClose={() => {
            setUpload(null)
          }}
        />
      )}
    </div>
  )
}

export default DeviceControls
