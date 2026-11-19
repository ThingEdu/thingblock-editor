import { fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import ModalSettings from '../../../src/components/modal-settings/modal-settings'
import { setLinkMode } from '../../../src/reducers/settings'
import { renderInEditor, vmOf } from '../render-in-editor'

afterEach(() => {
  history.replaceState(null, '')
})

test('choosing the link client sets the link mode in the store, the cookie and the VM', () => {
  const store = createEditorStore()
  store.dispatch(setLinkMode('cloud'))
  const vm = vmOf(store)
  const setVmLinkMode = vi.spyOn(vm.link, 'setLinkMode').mockReturnValue()
  const loadResourcePacks = vi.spyOn(vm.devices, 'loadResourcePacks').mockResolvedValue()
  renderInEditor(<ModalSettings onRequestClose={vi.fn()} />, store)

  expect(screen.getByRole('radio', { name: /Cloud client/ })).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByRole('radio', { name: /Link client/ }))

  expect(store.getState().scratchGui.settings.linkMode).toBe('link')
  expect(document.cookie).toContain('scratchlinkmode=link')
  expect(setVmLinkMode).toHaveBeenCalledWith('link')
  expect(loadResourcePacks).toHaveBeenCalled()
})
