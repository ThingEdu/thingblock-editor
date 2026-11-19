import { fireEvent, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import MenuBar from '../../../src/components/menu-bar/menu-bar'
import { MenuRefProvider } from '../../../src/contexts/menu-ref-context'
import { renderInEditor } from '../render-in-editor'

test('the Debug and Settings buttons open their modals', () => {
  const { store } = renderInEditor(
    <MenuRefProvider>
      <MenuBar />
    </MenuRefProvider>,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Debug' }))
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

  const { modals } = store.getState().scratchGui
  expect(modals.debugModal).toBe(true)
  expect(modals.settingsModal).toBe(true)
})
