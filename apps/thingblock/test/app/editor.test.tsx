import { render, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Editor from '../../src/app/editor'
import { createEditorStore } from '../../src/app/store'
import { LoadingState } from '../../src/reducers/project-state'
import { storeWrapper } from '../hooks/store-wrapper'

afterEach(() => {
  delete window.thingblockVm
})

test('the editor opens a new default project, unchanged, named after the default title', async () => {
  const store = createEditorStore()
  const vm = store.getState().scratchGui.vm
  if (!vm) throw new Error('the store has no VM')
  // The VM's runtime loop and the link helper are not part of this test
  vi.spyOn(vm, 'start').mockImplementation(() => undefined)
  vi.spyOn(vm.devices, 'loadResourcePacks').mockResolvedValue()
  const Wrapper = storeWrapper(store)

  render(
    <Wrapper>
      <Editor />
    </Wrapper>,
  )

  await waitFor(() => {
    expect(store.getState().scratchGui.projectState.loadingState).toBe(LoadingState.SHOWING)
  })
  const state = store.getState().scratchGui
  expect(state.projectTitle).toBe('ThingBlock Project')
  expect(state.projectChanged).toBe(false)
  expect(vm.runtime.targets).toHaveLength(2)
  expect(window.thingblockVm).toBe(vm)
})
