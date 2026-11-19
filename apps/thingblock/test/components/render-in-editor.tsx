import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createEditorStore, type EditorStore } from '../../src/app/store'
import { ModalFocusProvider } from '../../src/contexts/modal-focus-context'
import { storeWrapper } from '../hooks/store-wrapper'

/**
 * Renders a component with what the editor provides it: the store, its locale, and modal focus handling.
 * @param ui - The component to render.
 * @param store - The store; a new one by default.
 * @returns Testing Library's render result, with the store.
 */
export const renderInEditor = (ui: ReactElement, store: EditorStore = createEditorStore()) => ({
  store,
  ...render(<ModalFocusProvider>{ui}</ModalFocusProvider>, { wrapper: storeWrapper(store) }),
})

/**
 * @param store - The store holding the VM.
 * @returns The store's VM.
 */
export const vmOf = (store: EditorStore) => {
  const vm = store.getState().scratchGui.vm
  if (!vm) throw new Error('vmOf: the store has no VM')
  return vm
}
