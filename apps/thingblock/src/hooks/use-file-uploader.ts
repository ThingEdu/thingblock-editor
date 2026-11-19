import { type MessageDescriptor, defineMessages, useIntl } from 'react-intl'
import { useStore } from 'react-redux'
import { type RootState, useAppDispatch } from '../app/store'
import log from '../lib/log'
import { confirmReplaceProject } from '../lib/project/native-dialogs'
import { isDesktopApp, pickProjectFile, setCurrentFile, showFileInWindowTitle } from '../lib/project/project-file'
import { getProjectTitleFromFilename } from '../lib/project/sb-file-uploader-utils'
import { closeLoadingProject, openLoadingProject } from '../reducers/modals'
import { LoadingState, onLoadedProject, requestProjectUpload } from '../reducers/project-state'
import { setProjectTitle } from '../reducers/project-title'
import { useVm } from './use-vm'

const messages = defineMessages({
  loadError: {
    id: 'gui.projectLoader.loadError',
    defaultMessage: 'The project file that was selected failed to load.',
    description: 'An error that displays when a local project file fails to load.',
  },
})

// Opens the browser's file chooser; resolves with null when the learner cancels it
const chooseFile = () =>
  new Promise<File | null>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.tb'
    input.style.display = 'none'
    const settle = (file: File | null) => {
      input.remove()
      resolve(file)
    }
    input.addEventListener('change', () => settle(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => settle(null))
    document.body.appendChild(input)
    input.click()
  })

/**
 * Loads a project file from the computer into the editor (File > Load from your computer).
 * @returns The function that starts the load.
 */
export const useFileUploader = () => {
  const intl = useIntl()
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()
  const vm = useVm()

  // Asks before replacing a changed project, then moves the project state to loading. False when the current
  // project stays: the learner kept it, or another project is loading.
  const startLoading = async () => {
    const { projectChanged, projectState } = store.getState().scratchGui
    if (projectChanged && projectState.loadingState === LoadingState.SHOWING) {
      if (!(await confirmReplaceProject(intl))) return false
    }
    dispatch(requestProjectUpload())
    return store.getState().scratchGui.projectState.loadingState === LoadingState.LOADING_VM_FILE_UPLOAD
  }

  const finishLoading = (loaded: boolean) => {
    dispatch(onLoadedProject(LoadingState.LOADING_VM_FILE_UPLOAD, loaded))
  }

  // Loads a file's bytes into the VM, and then shows it, or the project that was there when it fails
  const load = async (data: ArrayBuffer, title: string, errorMessage: MessageDescriptor) => {
    dispatch(openLoadingProject())
    let loaded = false
    try {
      await vm.project.load(data)
      if (title) dispatch(setProjectTitle(title))
      loaded = true
    } catch (error) {
      log.warn(error)
      alert(intl.formatMessage(errorMessage))
    }
    finishLoading(loaded)
    dispatch(closeLoadingProject())
    return loaded
  }

  // The desktop app's Open dialog gives the file's path, so saving writes back to it
  const loadFromDesktop = async () => {
    let file
    try {
      file = await pickProjectFile()
    } catch (error) {
      log.warn(error)
      alert(intl.formatMessage(messages.loadError))
      return
    }
    if (!file || !(await startLoading())) return
    if (await load(file.data, getProjectTitleFromFilename(file.name), messages.loadError)) {
      setCurrentFile(file)
      showFileInWindowTitle(file.name)
    }
  }

  const loadFromComputer = async () => {
    if (isDesktopApp()) {
      await loadFromDesktop()
      return
    }
    const file = await chooseFile()
    if (!file || !(await startLoading())) return
    await load(await file.arrayBuffer(), getProjectTitleFromFilename(file.name), messages.loadError)
  }

  return { loadFromComputer }
}
