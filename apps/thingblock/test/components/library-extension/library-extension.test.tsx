import { fireEvent, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import LibraryExtension from '../../../src/components/library-extension/library-extension'
import { openExtensionLibrary } from '../../../src/reducers/modals'
import { renderInEditor, vmOf } from '../render-in-editor'

const setUp = (loaded: boolean) => {
  const store = createEditorStore()
  const { extensionManager } = vmOf(store)
  vi.spyOn(extensionManager, 'isExtensionLoaded').mockReturnValue(loaded)
  const loadExtensionURL = vi.spyOn(extensionManager, 'loadExtensionURL').mockResolvedValue(undefined)
  const onCategorySelected = vi.fn()
  store.dispatch(openExtensionLibrary())
  renderInEditor(<LibraryExtension onCategorySelected={onCategorySelected} />, store)
  return { store, loadExtensionURL, onCategorySelected }
}

test('choosing an extension loads it, closes the library, and shows its blocks', async () => {
  const { store, loadExtensionURL, onCategorySelected } = setUp(false)

  fireEvent.click(await screen.findByRole('button', { name: /Camera AI/ }))

  expect(loadExtensionURL).toHaveBeenCalledWith('cameraAi')
  expect(store.getState().scratchGui.modals.extensionLibrary).toBe(false)
  await waitFor(() => {
    expect(onCategorySelected).toHaveBeenCalledWith('cameraAi')
  })
})

test('choosing a loaded extension shows its blocks without loading it again', async () => {
  const { loadExtensionURL, onCategorySelected } = setUp(true)

  fireEvent.click(await screen.findByRole('button', { name: /Camera AI/ }))

  expect(loadExtensionURL).not.toHaveBeenCalled()
  expect(onCategorySelected).toHaveBeenCalledWith('cameraAi')
})
