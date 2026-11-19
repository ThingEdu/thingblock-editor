import { fireEvent, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import MenuBoard from '../../../src/components/menu-board/menu-board'
import { setDevice } from '../../../src/reducers/board'
import { renderInEditor, vmOf } from '../render-in-editor'

test('names the selected board, even a hidden one, and opens the board library', () => {
  const store = createEditorStore()
  const [device] = vmOf(store).devices.getDeviceList({ includeHidden: true }) as { deviceId: string; name: string }[]
  store.dispatch(setDevice(device.deviceId))
  renderInEditor(<MenuBoard />, store)

  fireEvent.click(screen.getByRole('button', { name: `Board: ${device.name}` }))

  expect(store.getState().scratchGui.modals.boardLibrary).toBe(true)
})
