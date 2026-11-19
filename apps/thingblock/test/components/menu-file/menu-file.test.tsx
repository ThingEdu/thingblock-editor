import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import MenuFile from '../../../src/components/menu-file/menu-file'
import { MenuRefProvider } from '../../../src/contexts/menu-ref-context'
import saveProject from '../../../src/lib/project/save-project'
import { setProjectChanged } from '../../../src/reducers/project-changed'
import { LoadingState } from '../../../src/reducers/project-state'
import { renderInEditor } from '../render-in-editor'

vi.mock('../../../src/lib/project/save-project', () => ({ default: vi.fn(() => Promise.resolve(null)) }))

afterEach(() => {
  vi.restoreAllMocks()
})

const clickNew = (changed: boolean) => {
  const store = createEditorStore()
  if (changed) store.dispatch(setProjectChanged())
  renderInEditor(
    <MenuRefProvider>
      <MenuFile />
    </MenuRefProvider>,
    store,
  )
  fireEvent.click(screen.getByRole('button', { name: 'File menu' }))
  fireEvent.click(screen.getByText('New'))
  return store
}

test('New asks before replacing a changed project, and keeps it when declined', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const store = clickNew(true)

  await waitFor(() => expect(confirm).toHaveBeenCalledWith('Replace contents of the current project?'))
  expect(store.getState().scratchGui.projectState.loadingState).toBe(LoadingState.NOT_LOADED)
})

test('New starts a new project at once when nothing changed', () => {
  const confirm = vi.spyOn(window, 'confirm')
  const store = clickNew(false)

  return waitFor(() => {
    expect(store.getState().scratchGui.projectState.loadingState).toBe(LoadingState.FETCHING_NEW_DEFAULT)
    expect(confirm).not.toHaveBeenCalled()
  })
})

test('Ctrl+S saves to the project file, and Ctrl+Shift+S saves as', () => {
  renderInEditor(
    <MenuRefProvider>
      <MenuFile />
    </MenuRefProvider>,
  )

  fireEvent.keyDown(document, { key: 's', ctrlKey: true })
  fireEvent.keyDown(document, { key: 'S', ctrlKey: true, shiftKey: true })

  expect(vi.mocked(saveProject).mock.calls.map(([options]) => options.saveAs)).toEqual([false, true])
})
