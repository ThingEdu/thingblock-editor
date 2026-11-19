import { act, renderHook } from '@testing-library/react'
import { createIntl } from 'react-intl'
import { afterEach, expect, test } from 'vitest'
import { createEditorStore } from '../../src/app/store'
import { useProjectFetcher } from '../../src/hooks/use-project-fetcher'
import { savePreference } from '../../src/lib/preferences/user-preferences'
import defaultProject from '../../src/lib/project/default-project'
import { BLOCKS_TAB_INDEX, activateTab } from '../../src/reducers/editor-tab'
import { setProjectChanged } from '../../src/reducers/project-changed'
import {
  LoadingState,
  onLoadedProject,
  requestNewProject,
  requestProjectUpload,
} from '../../src/reducers/project-state'
import { storeWrapper } from './store-wrapper'

const CODE_TAB_INDEX = 1

const englishProject = () => defaultProject(createIntl({ locale: 'en' }).formatMessage)

afterEach(() => {
  localStorage.clear()
})

const render = (store = createEditorStore()) => {
  renderHook(useProjectFetcher, { wrapper: storeWrapper(store) })
  return store
}

test('a requested new project is the default project', () => {
  const store = render()

  act(() => {
    store.dispatch(requestNewProject())
  })

  expect(store.getState().scratchGui.projectState).toMatchObject({
    loadingState: LoadingState.LOADING_VM_NEW_DEFAULT,
    projectData: englishProject(),
  })
})

test('a new project starts on the board the learner chose last time', () => {
  savePreference('device', 'thingbot')
  const store = render()

  act(() => {
    store.dispatch(requestNewProject())
  })

  expect(store.getState().scratchGui.projectState.projectData).toEqual({
    ...englishProject(),
    board: { device: 'thingbot', peripherals: [] },
  })
})

test('a project that shows is unchanged, on the Blocks tab', () => {
  const store = render()
  act(() => {
    store.dispatch(requestProjectUpload())
    store.dispatch(setProjectChanged())
    store.dispatch(activateTab(CODE_TAB_INDEX))
  })

  act(() => {
    store.dispatch(onLoadedProject(LoadingState.LOADING_VM_FILE_UPLOAD, true))
  })

  expect(store.getState().scratchGui.projectChanged).toBe(false)
  expect(store.getState().scratchGui.editorTab.activeTabIndex).toBe(BLOCKS_TAB_INDEX)
})
