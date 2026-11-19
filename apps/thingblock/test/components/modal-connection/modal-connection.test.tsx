import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import ModalConnection from '../../../src/components/modal-connection/modal-connection'
import { setConnectionModalExtensionId } from '../../../src/reducers/connection-modal'
import { openConnectionModal } from '../../../src/reducers/modals'
import { renderInEditor, vmOf } from '../render-in-editor'

const setUp = ({ firmware = false } = {}) => {
  const store = createEditorStore()
  const vm = vmOf(store)
  const spies = {
    scan: vi.spyOn(vm, 'scanForPeripheral').mockReturnValue(),
    connect: vi.spyOn(vm, 'connectPeripheral').mockReturnValue(),
    disconnect: vi.spyOn(vm, 'disconnectPeripheral').mockReturnValue(),
    isConnected: vi.spyOn(vm, 'getPeripheralIsConnected').mockReturnValue(false),
  }
  vi.spyOn(vm.devices, 'getDeviceFirmware').mockReturnValue(
    firmware ? [{ id: 'telemetrix-ble', name: 'Telemetrix' }] : [],
  )
  store.dispatch(setConnectionModalExtensionId('thingbotTelemetrix'))
  store.dispatch(openConnectionModal())
  return { vm, spies, ...renderInEditor(<ModalConnection />, store) }
}

afterEach(() => {
  history.replaceState(null, '')
  Reflect.deleteProperty(navigator, 'bluetooth')
})

test('without Web Bluetooth, the scan starts at once and lists the devices it finds', () => {
  const { vm, spies } = setUp()

  expect(spies.scan).toHaveBeenCalledWith('thingbotTelemetrix')
  act(() => {
    vm.events.emit('PERIPHERAL_LIST_UPDATE', { a: { peripheralId: 'a', name: 'ThingBot A', rssi: -50 } })
  })
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

  expect(spies.connect).toHaveBeenCalledWith('thingbotTelemetrix', 'a')
  expect(screen.getByText('Connecting')).toBeTruthy()
})

test('Web Bluetooth uses the browser’s chooser, so the user starts the scan', () => {
  Object.defineProperty(navigator, 'bluetooth', { value: {}, configurable: true })
  const { spies } = setUp()

  expect(spies.scan).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Start Searching' }))

  expect(spies.scan).toHaveBeenCalledWith('thingbotTelemetrix')
})

test('an error while scanning means ThingBlock Link is not running', () => {
  const { vm } = setUp()

  act(() => {
    vm.events.emit('PERIPHERAL_REQUEST_ERROR')
  })

  expect(screen.getByText('Make sure you have ThingBlock Link installed and running')).toBeTruthy()
  // ThingBot has no help page
  expect(screen.queryByRole('button', { name: /Help/ })).toBeNull()
})

test('an error while connecting shows the error step', () => {
  const { vm } = setUp()
  act(() => {
    vm.events.emit('PERIPHERAL_LIST_UPDATE', { a: { peripheralId: 'a', name: 'ThingBot A' } })
  })
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

  act(() => {
    vm.events.emit('PERIPHERAL_REQUEST_ERROR')
  })

  expect(screen.getByText('Oops, looks like something went wrong.')).toBeTruthy()
})

test('once connected, Go to Editor closes the modal and keeps the connection', () => {
  const { store, vm, spies } = setUp()
  act(() => {
    vm.events.emit('PERIPHERAL_CONNECTED')
  })
  spies.isConnected.mockReturnValue(true)

  fireEvent.click(screen.getByRole('button', { name: 'Go to Editor' }))

  expect(spies.disconnect).not.toHaveBeenCalled()
  expect(store.getState().scratchGui.modals.connectionModal).toBe(false)
})

test('closing while scanning stops the scan', () => {
  const { store, spies } = setUp()

  fireEvent.click(screen.getByRole('button', { name: 'Close' }))

  expect(spies.disconnect).toHaveBeenCalledWith('thingbotTelemetrix')
  expect(store.getState().scratchGui.modals.connectionModal).toBe(false)
})

test('Update my Device opens the firmware install', () => {
  const { vm } = setUp({ firmware: true })
  vi.spyOn(vm.link, 'listBoards').mockResolvedValue([])

  fireEvent.click(screen.getByRole('button', { name: /Update my Device/ }))

  expect(screen.getByText('Looking for USB boards')).toBeTruthy()
})
