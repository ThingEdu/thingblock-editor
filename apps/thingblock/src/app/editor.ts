import { useEffect } from 'react'
import { useLeavePagePrompt } from '../hooks/use-leave-page-prompt'
import { useProjectFetcher } from '../hooks/use-project-fetcher'
import { useProjectTitle } from '../hooks/use-project-title'
import { useSystemPreferences } from '../hooks/use-system-preferences'
import { useVm } from '../hooks/use-vm'
import { useVmListener } from '../hooks/use-vm-listener'
import { useVmManager } from '../hooks/use-vm-manager'
import { requestNewProject } from '../reducers/project-state'
import { useAppDispatch } from './store'

/**
 * The editor: runs the hooks that serve all of it, and opens a new project.
 * @returns Nothing yet: the editor's UI is not ported.
 */
const Editor = () => {
  const dispatch = useAppDispatch()
  const vm = useVm()
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

  return null
}

export default Editor
