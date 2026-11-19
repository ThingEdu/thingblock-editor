import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../src/app/store'
import { useFileUploader } from '../../src/hooks/use-file-uploader'
import { forgetCurrentFile, getCurrentFile } from '../../src/lib/project/project-file'
import { setProjectChanged } from '../../src/reducers/project-changed'
import { LoadingState, onLoadedProject, requestProjectUpload } from '../../src/reducers/project-state'
import { storeWrapper } from './store-wrapper'

const bytes = new Uint8Array([1, 2, 3])

// The browser's file chooser: picks this file, or is cancelled when there is none
const chooseInFileChooser = (file: File | null) =>
  vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
    if (!file) {
      this.dispatchEvent(new Event('cancel'))
      return
    }
    Object.defineProperty(this, 'files', { value: [file] })
    this.dispatchEvent(new Event('change'))
  })

beforeEach(() => {
  vi.spyOn(window, 'alert').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  delete window.__TAURI_INTERNALS__
  forgetCurrentFile()
})

// A store showing a project, with the hook rendered against it
const setUp = () => {
  const store = createEditorStore()
  store.dispatch(requestProjectUpload())
  store.dispatch(onLoadedProject(LoadingState.LOADING_VM_FILE_UPLOAD, true))
  const vm = store.getState().scratchGui.vm
  if (!vm) throw new Error('the store has no VM')
  const load = vi.spyOn(vm.project, 'load').mockResolvedValue()
  const { result } = renderHook(useFileUploader, { wrapper: storeWrapper(store) })
  return { store, load, uploader: result.current }
}

test('a file chosen from the computer is loaded, and named after the file', async () => {
  chooseInFileChooser(new File([bytes], 'Xe dò line.tb'))
  const { store, load, uploader } = setUp()

  await act(() => uploader.loadFromComputer())

  expect(new Uint8Array(load.mock.calls[0][0] as ArrayBuffer)).toEqual(bytes)
  const state = store.getState().scratchGui
  expect(state.projectState.loadingState).toBe(LoadingState.SHOWING)
  expect(state.projectTitle).toBe('Xe dò line')
  expect(state.modals.loadingProject).toBe(false)
  expect(document.querySelector('input[type=file]')).toBeNull()
})

test('cancelling the file chooser keeps the project', async () => {
  chooseInFileChooser(null)
  const { store, load, uploader } = setUp()

  await act(() => uploader.loadFromComputer())

  expect(load).not.toHaveBeenCalled()
  expect(store.getState().scratchGui.projectState.loadingState).toBe(LoadingState.SHOWING)
  expect(document.querySelector('input[type=file]')).toBeNull()
})

test('a changed project is replaced only when the learner agrees', async () => {
  chooseInFileChooser(new File([bytes], 'other.tb'))
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const { store, load, uploader } = setUp()
  store.dispatch(setProjectChanged())

  await act(() => uploader.loadFromComputer())
  expect(load).not.toHaveBeenCalled()
  expect(store.getState().scratchGui.projectChanged).toBe(true)

  confirm.mockReturnValue(true)
  await act(() => uploader.loadFromComputer())
  expect(load).toHaveBeenCalledOnce()
})

test('a file that fails to load leaves the project showing, and says so', async () => {
  chooseInFileChooser(new File([bytes], 'broken.tb'))
  const { store, load, uploader } = setUp()
  load.mockRejectedValue(new Error('not a project'))

  await act(() => uploader.loadFromComputer())

  expect(window.alert).toHaveBeenCalledWith('The project file that was selected failed to load.')
  const state = store.getState().scratchGui
  expect(state.projectState.loadingState).toBe(LoadingState.SHOWING)
  expect(state.projectTitle).not.toBe('broken')
  expect(state.modals.loadingProject).toBe(false)
})

test('in the desktop app the file comes from the Open dialog, and saving writes back to it', async () => {
  const data = bytes.buffer
  window.__TAURI_INTERNALS__ = {
    invoke: vi.fn((command: string) => {
      if (command === 'pick_open_path') return Promise.resolve('/Users/em/Xe dò line.tb')
      if (command === 'read_project_file') return Promise.resolve(data)
      return Promise.resolve(null)
    }),
  }
  const { store, load, uploader } = setUp()

  await act(() => uploader.loadFromComputer())

  expect(load).toHaveBeenCalledWith(data)
  expect(store.getState().scratchGui.projectTitle).toBe('Xe dò line')
  expect(getCurrentFile()).toEqual({ path: '/Users/em/Xe dò line.tb', name: 'Xe dò line.tb' })
  expect(document.title).toBe('Xe dò line.tb — ThingBlock')
})

test('an example is fetched and loaded under its title', async () => {
  const fetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(bytes))
  const { store, load, uploader } = setUp()

  await act(() => uploader.loadExample({ url: '/examples/blink.tb', title: 'Nháy đèn' }))

  expect(fetch).toHaveBeenCalledWith('/examples/blink.tb')
  expect(new Uint8Array(load.mock.calls[0][0] as ArrayBuffer)).toEqual(bytes)
  expect(store.getState().scratchGui.projectTitle).toBe('Nháy đèn')
})

test('an example that cannot be fetched leaves the project showing, and says so', async () => {
  vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 404 }))
  const { store, load, uploader } = setUp()

  await act(() => uploader.loadExample({ url: '/examples/missing.tb', title: 'Missing' }))

  expect(load).not.toHaveBeenCalled()
  expect(window.alert).toHaveBeenCalledWith('The example project could not be loaded.')
  expect(store.getState().scratchGui.projectState.loadingState).toBe(LoadingState.SHOWING)
})
