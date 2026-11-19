import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../src/app/store'
import { useVmManager } from '../../src/hooks/use-vm-manager'
import defaultProject from '../../src/lib/project/default-project'
import { setProjectChanged } from '../../src/reducers/project-changed'
import { LoadingState, onFetchedProjectData, requestNewProject } from '../../src/reducers/project-state'
import { setStartedState } from '../../src/reducers/vm-status'
import { storeWrapper } from './store-wrapper'

const setUp = () => {
  const store = createEditorStore()
  const vm = store.getState().scratchGui.vm
  if (!vm) throw new Error('the store has no VM')
  // The VM's runtime loop and the link helper are not part of these tests
  const start = vi.spyOn(vm, 'start').mockImplementation(() => undefined)
  const loadResourcePacks = vi.spyOn(vm.devices, 'loadResourcePacks').mockResolvedValue()
  const render = () => renderHook(useVmManager, { wrapper: storeWrapper(store) })
  return { store, vm, start, loadResourcePacks, render }
}

test('the VM is set up in the editor locale and link mode, and started', () => {
  const { store, vm, start, loadResourcePacks, render } = setUp()
  const setLocale = vi.spyOn(vm, 'setLocale')
  const setLinkMode = vi.spyOn(vm.link, 'setLinkMode')

  render()

  const { locales, scratchGui } = store.getState()
  expect(setLocale).toHaveBeenCalledWith(locales.locale, locales.messages)
  expect(setLinkMode).toHaveBeenCalledWith(scratchGui.settings.linkMode)
  expect(loadResourcePacks).toHaveBeenCalledOnce()
  expect(start).toHaveBeenCalledOnce()
})

test('a started VM is not started again', () => {
  const { store, start, render } = setUp()
  store.dispatch(setStartedState(true))

  render()

  expect(start).not.toHaveBeenCalled()
})

test('the built default project is loaded into the VM, then shows unchanged', async () => {
  const { store, vm, render } = setUp()
  const load = vi.spyOn(vm.project, 'load')
  render()
  const project = defaultProject()

  act(() => {
    store.dispatch(requestNewProject())
    store.dispatch(onFetchedProjectData(project))
    store.dispatch(setProjectChanged())
  })

  expect(load).toHaveBeenCalledWith(project)
  await waitFor(() => {
    expect(store.getState().scratchGui.projectState.loadingState).toBe(LoadingState.SHOWING)
    expect(store.getState().scratchGui.projectChanged).toBe(false)
  })
})

test('a default project that fails to load is an error', async () => {
  const { store, vm, render } = setUp()
  const error = new Error('broken project')
  vi.spyOn(vm.project, 'load').mockRejectedValue(error)
  render()

  act(() => {
    store.dispatch(requestNewProject())
    store.dispatch(onFetchedProjectData(defaultProject()))
  })

  await waitFor(() => {
    expect(store.getState().scratchGui.projectState).toMatchObject({ loadingState: LoadingState.ERROR, error })
  })
})
