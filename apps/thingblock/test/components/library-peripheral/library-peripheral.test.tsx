import { fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import LibraryPeripheral from '../../../src/components/library-peripheral/library-peripheral'
import { openPeripheralLibrary } from '../../../src/reducers/modals'
import { renderInEditor, vmOf } from '../render-in-editor'

test('clicking a peripheral adds it, or removes it, and keeps the library open', async () => {
  const store = createEditorStore()
  const { devices } = vmOf(store)
  vi.spyOn(devices, 'getPeripheralList').mockReturnValue([
    { id: 'servo', name: 'Servo', active: false, locked: false },
    { id: 'buzzer', name: 'Buzzer', active: true, locked: false },
  ])
  const addPeripheral = vi.spyOn(devices, 'addPeripheral').mockResolvedValue()
  const removePeripheral = vi.spyOn(devices, 'removePeripheral').mockReturnValue()
  store.dispatch(openPeripheralLibrary())
  renderInEditor(<LibraryPeripheral />, store)

  fireEvent.click(await screen.findByRole('button', { name: /Servo/ }))
  fireEvent.click(screen.getByRole('button', { name: /Buzzer/ }))

  expect(addPeripheral).toHaveBeenCalledWith('servo')
  expect(removePeripheral).toHaveBeenCalledWith('buzzer')
  expect(store.getState().scratchGui.modals.peripheralLibrary).toBe(true)
})
