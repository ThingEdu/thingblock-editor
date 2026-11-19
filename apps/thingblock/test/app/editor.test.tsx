import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Editor from '../../src/app/editor'
import ErrorBoundary from '../../src/app/error-boundary'
import { createEditorStore } from '../../src/app/store'
import { setDevice } from '../../src/reducers/board'
import { LoadingState, projectError } from '../../src/reducers/project-state'
import { storeWrapper } from '../hooks/store-wrapper'

// jsdom cannot inject a Blockly workspace
vi.mock('../../src/components/blocks/blocks', () => ({ default: () => null }))

afterEach(() => {
  delete window.thingblockVm
})

const setUp = () => {
  const store = createEditorStore()
  const vm = store.getState().scratchGui.vm
  if (!vm) throw new Error('the store has no VM')
  // The VM's runtime loop and the link helper are not part of these tests
  vi.spyOn(vm, 'start').mockImplementation(() => undefined)
  vi.spyOn(vm.devices, 'loadResourcePacks').mockResolvedValue()
  vi.spyOn(vm.link, 'getPlatformStatus').mockResolvedValue(null)
  const Wrapper = storeWrapper(store)
  render(
    <Wrapper>
      <ErrorBoundary>
        <Editor />
      </ErrorBoundary>
    </Wrapper>,
  )
  return { store, vm }
}

test('the editor opens a new default project, unchanged, named after the default title', async () => {
  const { store, vm } = setUp()

  await waitFor(() => {
    expect(store.getState().scratchGui.projectState.loadingState).toBe(LoadingState.SHOWING)
  })
  const state = store.getState().scratchGui
  expect(state.projectTitle).toBe('ThingBlock Project')
  expect(state.projectChanged).toBe(false)
  expect(vm.runtime.targets).toHaveLength(2)
  expect(window.thingblockVm).toBe(vm)
})

test('a new project that fails to load crashes the editor', () => {
  const { store } = setUp()
  // The error boundary logs the error, as React does
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  act(() => {
    store.dispatch(projectError('no default project'))
  })

  expect(screen.getByText('Oops! Something went wrong.')).toBeTruthy()
})

test('the first board loads the Arduino extension', () => {
  const { store, vm } = setUp()
  const loadExtensionURL = vi.spyOn(vm.extensionManager, 'loadExtensionURL').mockResolvedValue(undefined)

  act(() => {
    store.dispatch(setDevice('arduinoUno'))
  })

  expect(loadExtensionURL).toHaveBeenCalledWith('arduino')
})
