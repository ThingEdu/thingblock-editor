import { fireEvent, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import ModalConnectionFirmware from '../../../src/components/modal-connection/modal-connection-firmware'
import { setConnectedBoard } from '../../../src/reducers/board'
import { renderInEditor, vmOf } from '../render-in-editor'

const firmware = { deviceId: 'thingbot', firmwareId: 'telemetrix-ble' }
const port = { id: '/dev/ttyUSB0', name: 'ThingBot (ttyUSB0)' }

const setUp = ({ connected = false } = {}) => {
  const store = createEditorStore()
  const { link } = vmOf(store)
  const spies = {
    listBoards: vi.spyOn(link, 'listBoards').mockResolvedValue([port]),
    connectBoard: vi.spyOn(link, 'connectBoard').mockResolvedValue(),
    disconnectBoard: vi.spyOn(link, 'disconnectBoard').mockResolvedValue(),
    flashFirmware: vi.spyOn(link, 'flashFirmware').mockResolvedValue(),
  }
  if (connected) store.dispatch(setConnectedBoard(port))
  const onScanning = vi.fn()
  renderInEditor(<ModalConnectionFirmware firmware={firmware} onScanning={onScanning} />, store)
  return { onScanning, ...spies }
}

test('flashes only after Install, on a port it opens and then releases', async () => {
  const { onScanning, listBoards, connectBoard, disconnectBoard, flashFirmware } = setUp()

  await screen.findByText(port.name)
  expect(flashFirmware).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'Install' }))

  await screen.findByText('Firmware installed')
  expect(listBoards).toHaveBeenCalledWith('thingbot')
  expect(connectBoard).toHaveBeenCalledWith('thingbot', port)
  expect(flashFirmware).toHaveBeenCalledWith('thingbot', 'telemetrix-ble')
  await waitFor(() => {
    expect(disconnectBoard).toHaveBeenCalled()
  })

  // The user starts the Bluetooth scan themselves
  expect(onScanning).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
  expect(onScanning).toHaveBeenCalled()
})

test('flashes an already connected board without reconnecting or releasing it', async () => {
  const { listBoards, connectBoard, disconnectBoard } = setUp({ connected: true })

  fireEvent.click(await screen.findByRole('button', { name: 'Install' }))

  await screen.findByText('Firmware installed')
  expect(listBoards).not.toHaveBeenCalled()
  expect(connectBoard).not.toHaveBeenCalled()
  expect(disconnectBoard).not.toHaveBeenCalled()
})

test('shows the error when the flash fails', async () => {
  const { flashFirmware } = setUp()
  flashFirmware.mockRejectedValue(new Error('esptool exited 2'))

  fireEvent.click(await screen.findByRole('button', { name: 'Install' }))

  expect(await screen.findByText(/esptool exited 2/)).toBeTruthy()
})

test('returns to the port list when the flash is stopped', async () => {
  const { flashFirmware, listBoards } = setUp()
  flashFirmware.mockRejectedValue(Object.assign(new Error('cancelled'), { code: 'cancelled' }))

  fireEvent.click(await screen.findByRole('button', { name: 'Install' }))

  await waitFor(() => {
    expect(listBoards).toHaveBeenCalledTimes(2)
  })
  expect(await screen.findByRole('button', { name: 'Install' })).toBeTruthy()
})
