import { act, fireEvent, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import MenuBarConnectThingbot from '../../../src/components/menu-bar/menu-bar-connect-thingbot'
import { extensionLoaded } from '../../../src/reducers/loaded-extensions'
import { renderInEditor, vmOf } from '../render-in-editor'

test('shows once the ThingBot extension is in the project, follows its connection, and opens the connection modal', () => {
  const store = createEditorStore()
  renderInEditor(<MenuBarConnectThingbot />, store)
  expect(screen.queryByRole('button')).toBeNull()

  act(() => {
    store.dispatch(extensionLoaded('thingbotTelemetrix'))
  })
  act(() => {
    vmOf(store).events.emit('PERIPHERAL_CONNECTED')
  })
  fireEvent.click(screen.getByRole('button', { name: 'ThingBot · Connected' }))

  expect(store.getState().scratchGui.connectionModal.extensionId).toBe('thingbotTelemetrix')
  expect(store.getState().scratchGui.modals.connectionModal).toBe(true)
})
