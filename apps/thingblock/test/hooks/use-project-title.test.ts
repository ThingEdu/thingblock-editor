import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { createEditorStore } from '../../src/app/store'
import { useProjectTitle } from '../../src/hooks/use-project-title'
import defaultProject from '../../src/lib/project/default-project'
import { selectLocale } from '../../src/reducers/locales'
import { onFetchedProjectData, requestNewProject } from '../../src/reducers/project-state'
import { setProjectTitle } from '../../src/reducers/project-title'
import { storeWrapper } from './store-wrapper'

const setUp = () => {
  const store = createEditorStore()
  renderHook(useProjectTitle, { wrapper: storeWrapper(store) })
  return store
}

test('a new project is called a ThingBlock project, in the editor language', () => {
  const store = setUp()

  act(() => {
    store.dispatch(requestNewProject())
  })
  expect(store.getState().scratchGui.projectTitle).toBe('ThingBlock Project')

  act(() => {
    store.dispatch(selectLocale('vi'))
  })
  expect(store.getState().scratchGui.projectTitle).toBe('Dự án ThingBlock')
})

test('a renamed project keeps its name when the language changes', () => {
  const store = setUp()
  act(() => {
    store.dispatch(requestNewProject())
  })
  act(() => {
    store.dispatch(onFetchedProjectData(defaultProject()))
    store.dispatch(setProjectTitle('Xe dò line'))
  })

  act(() => {
    store.dispatch(selectLocale('vi'))
  })

  expect(store.getState().scratchGui.projectTitle).toBe('Xe dò line')
})
