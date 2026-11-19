import { act, fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import LibraryBoard from '../../../src/components/library-board/library-board'
import { openBoardLibrary } from '../../../src/reducers/modals'
import { renderInEditor, vmOf } from '../render-in-editor'

const boards = [
  { deviceId: 'arduinoUno', iconURL: 'vm-arduino-uno.svg', name: 'Arduino Uno', description: 'The classic board.' },
  { deviceId: 'esp32', iconURL: 'vm-esp32.svg', name: 'ESP32 Dev Module', description: 'Wi-Fi and Bluetooth.' },
]

const setUp = (open = true) => {
  const store = createEditorStore()
  const getDeviceList = vi.spyOn(vmOf(store).devices, 'getDeviceList').mockReturnValue(boards)
  if (open) store.dispatch(openBoardLibrary())
  return { getDeviceList, ...renderInEditor(<LibraryBoard />, store) }
}

test('the library lists "No board" and the VM’s boards', async () => {
  setUp()

  expect(await screen.findByRole('button', { name: /No board/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Arduino Uno/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /ESP32 Dev Module/ })).toBeTruthy()
  expect(document.querySelector('img[src="vm-arduino-uno.svg"]')).not.toBeNull()
})

test('choosing a board selects it and closes the library', async () => {
  const { store } = setUp()

  fireEvent.click(await screen.findByRole('button', { name: /ESP32 Dev Module/ }))

  expect(store.getState().scratchGui.board.selectedDeviceId).toBe('esp32')
  expect(store.getState().scratchGui.modals.boardLibrary).toBe(false)
})

test('boards from resource packs that land while the library is open are listed', async () => {
  const { store, getDeviceList } = setUp()
  await screen.findByRole('button', { name: /Arduino Uno/ })

  getDeviceList.mockReturnValue([
    ...boards,
    { deviceId: 'thingbot', iconURL: 'thingbot.svg', name: 'ThingBot', description: 'ESP32-C3 robot.' },
  ])
  act(() => {
    vmOf(store).events.emit('RESOURCE_PACKS_LOADED')
  })

  expect(screen.getByRole('button', { name: /ThingBot/ })).toBeTruthy()
})
