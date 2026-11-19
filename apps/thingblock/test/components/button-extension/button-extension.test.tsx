import { fireEvent, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import ButtonExtension from '../../../src/components/button-extension/button-extension'
import { setDevice } from '../../../src/reducers/board'
import { renderInEditor } from '../render-in-editor'

test('without a board, the button adds an extension', () => {
  const { store } = renderInEditor(<ButtonExtension />)

  fireEvent.click(screen.getByRole('button', { name: 'Add Extension' }))

  expect(store.getState().scratchGui.modals.extensionLibrary).toBe(true)
  expect(screen.queryByRole('button', { name: 'Add Peripheral' })).toBeNull()
})

test('with a board, the button adds a peripheral', () => {
  const store = createEditorStore()
  store.dispatch(setDevice('arduinoUno'))
  renderInEditor(<ButtonExtension />, store)

  fireEvent.click(screen.getByRole('button', { name: 'Add Peripheral' }))

  expect(store.getState().scratchGui.modals.peripheralLibrary).toBe(true)
})
