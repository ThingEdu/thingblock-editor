import { act, fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import Gui from '../../../src/components/gui/gui'
import {
  LoadingState,
  onFetchedProjectData,
  onLoadedProject,
  requestNewProject,
  requestProjectUpload,
} from '../../../src/reducers/project-state'
import { renderInEditor, vmOf } from '../render-in-editor'

// jsdom cannot inject a Blockly workspace
vi.mock('../../../src/components/blocks/blocks', () => ({ default: () => null }))

const setUp = () => {
  const store = createEditorStore()
  // The side panel's platform install modal asks about the selected board; this link installs nothing
  vi.spyOn(vmOf(store).link, 'getPlatformStatus').mockResolvedValue(null)
  return renderInEditor(<Gui />, store)
}

test('shows the creating loader while a new project is made, and the loading one while a file loads', () => {
  const { store } = setUp()

  act(() => {
    store.dispatch(requestNewProject())
    store.dispatch(onFetchedProjectData({}))
  })
  expect(screen.getByText('Creating Project')).toBeTruthy()

  act(() => {
    store.dispatch(onLoadedProject(LoadingState.LOADING_VM_NEW_DEFAULT, true))
  })
  expect(screen.queryByText('Creating Project')).toBeNull()

  act(() => {
    store.dispatch(requestProjectUpload())
  })
  expect(screen.getByText('Loading Project')).toBeTruthy()

  act(() => {
    store.dispatch(onLoadedProject(LoadingState.LOADING_VM_FILE_UPLOAD, true))
  })
  expect(screen.queryByText('Loading Project')).toBeNull()
})

test('dragging the handle resizes the side panel, within its bounds', () => {
  setUp()
  const panel = screen.getByRole('complementary', { name: 'Stage and target' })
  const handle = panel.previousElementSibling
  if (!handle) throw new Error('no resize handle before the side panel')

  fireEvent.mouseDown(handle, { clientX: 500 })
  fireEvent.mouseMove(document, { clientX: 400 })
  expect(panel.style.flex).toBe('0 0 640px')

  fireEvent.mouseMove(document, { clientX: 0 })
  expect(panel.style.flex).toBe('0 0 700px')

  fireEvent.mouseUp(document)
  fireEvent.mouseMove(document, { clientX: 900 })
  expect(panel.style.flex).toBe('0 0 700px')
})
