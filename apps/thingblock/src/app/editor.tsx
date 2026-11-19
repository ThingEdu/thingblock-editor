import { useEffect } from 'react'
import Gui from '../components/gui/gui'
import { useLeavePagePrompt } from '../hooks/use-leave-page-prompt'
import { useProjectFetcher } from '../hooks/use-project-fetcher'
import { useProjectTitle } from '../hooks/use-project-title'
import { useSystemPreferences } from '../hooks/use-system-preferences'
import { useVm } from '../hooks/use-vm'
import { useVmListener } from '../hooks/use-vm-listener'
import { useVmManager } from '../hooks/use-vm-manager'
import { getIsError, requestNewProject } from '../reducers/project-state'
import { useAppDispatch, useAppSelector } from './store'

/**
 * The editor: runs the hooks that serve all of it, opens a new project, and shows the editor's page.
 * @returns The editor's page.
 */
const Editor = () => {
  const dispatch = useAppDispatch()
  const vm = useVm()
  const isError = useAppSelector((state) => getIsError(state.scratchGui.projectState.loadingState))
  const error = useAppSelector((state) => state.scratchGui.projectState.error)
  const selectedDeviceId = useAppSelector((state) => state.scratchGui.board.selectedDeviceId)
  // First, so its listeners hear the events the VM manager's setup causes
  useVmListener()
  useVmManager()
  useProjectFetcher()
  useProjectTitle()
  useSystemPreferences()
  useLeavePagePrompt()

  useEffect(() => {
    dispatch(requestNewProject())
  }, [dispatch])

  useEffect(() => {
    if (import.meta.env.DEV) window.thingblockVm = vm
  }, [vm])

  // The board-only blocks are in the Arduino extension, so the first board loads it for the palette. It stays loaded
  // when the board is deselected; the toolbox hides its category.
  useEffect(() => {
    if (selectedDeviceId === null || vm.extensionManager.isExtensionLoaded('arduino')) return
    void vm.extensionManager.loadExtensionURL('arduino')
  }, [vm, selectedDeviceId])

  // The error boundary shows the crash message
  if (isError) throw new Error(`Editor: the project failed to load: ${String(error)}`)

  return <Gui />
}

export default Editor
