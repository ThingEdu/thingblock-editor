import { act, fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import ExtensionPaneThingbotTelemetrix from '../../../src/components/extension-pane-thingbot-telemetrix/extension-pane-thingbot-telemetrix'
import { renderInEditor, vmOf } from '../render-in-editor'

test('without a ThingBot, Connect opens its connection modal', () => {
  const { store } = renderInEditor(<ExtensionPaneThingbotTelemetrix />)

  expect(screen.getByText('ThingBot not connected')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

  expect(store.getState().scratchGui.connectionModal.extensionId).toBe('thingbotTelemetrix')
  expect(store.getState().scratchGui.modals.connectionModal).toBe(true)
})

test('follows the ThingBot’s own connection, not other peripherals’, and disconnects it', () => {
  const store = createEditorStore()
  const vm = vmOf(store)
  const isConnected = vi.spyOn(vm, 'getPeripheralIsConnected').mockReturnValue(false)
  const disconnect = vi.spyOn(vm, 'disconnectPeripheral').mockImplementation(() => undefined)
  renderInEditor(<ExtensionPaneThingbotTelemetrix />, store)

  act(() => {
    vm.events.emit('PERIPHERAL_CONNECTED')
  })
  expect(screen.getByText('ThingBot not connected')).toBeTruthy()

  isConnected.mockImplementation((extensionId) => extensionId === 'thingbotTelemetrix')
  act(() => {
    vm.events.emit('PERIPHERAL_CONNECTED')
  })
  fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))

  expect(disconnect).toHaveBeenCalledWith('thingbotTelemetrix')
})
