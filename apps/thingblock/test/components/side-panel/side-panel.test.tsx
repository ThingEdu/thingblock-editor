import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import SidePanel from '../../../src/components/side-panel/side-panel'
import { setDevice } from '../../../src/reducers/board'
import { setGeneratedCode } from '../../../src/reducers/code'
import { extensionLoaded } from '../../../src/reducers/loaded-extensions'
import { renderInEditor, vmOf } from '../render-in-editor'

const setUp = () => {
  const store = createEditorStore()
  // The panel's platform install modal asks about the selected board; this link installs nothing
  vi.spyOn(vmOf(store).link, 'getPlatformStatus').mockResolvedValue(null)
  return renderInEditor(<SidePanel width={480} />, store)
}

const baudRate = () => screen.queryByRole('combobox', { name: 'Serial monitor baud rate' })

afterEach(() => {
  // Hidden panes are kept across reloads
  localStorage.clear()
})

test('with a board, it shows the generated code and the serial monitor; without one, the host monitor', () => {
  const { store } = setUp()

  act(() => {
    store.dispatch(setGeneratedCode('void loop() {}'))
    store.dispatch(setDevice('arduinoUno'))
  })
  expect(screen.getByText('loop')).toBeTruthy()
  expect(baudRate()).toBeTruthy()

  act(() => {
    store.dispatch(setDevice(null))
  })
  expect(screen.queryByText('loop')).toBeNull()
  expect(baudRate()).toBeNull()
  expect(screen.getByPlaceholderText('Send message...')).toBeTruthy()
})

test('with every pane hidden from its menu, it says how to show one', () => {
  setUp()

  fireEvent.click(screen.getByRole('button', { name: 'Show panels' }))
  fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Monitor' }))

  expect(screen.queryByPlaceholderText('Send message...')).toBeNull()
  expect(screen.getByText(/No panel shown/)).toBeTruthy()
})

test('an extension’s pane shows once the extension is in the project, and hides from the menu', () => {
  const { store } = setUp()
  const cameraActions = () => screen.queryByRole('button', { name: 'Camera actions' })
  expect(cameraActions()).toBeNull()

  act(() => {
    store.dispatch(extensionLoaded('cameraAi'))
  })
  expect(cameraActions()).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Show panels' }))
  fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Camera AI' }))
  expect(cameraActions()).toBeNull()
})
