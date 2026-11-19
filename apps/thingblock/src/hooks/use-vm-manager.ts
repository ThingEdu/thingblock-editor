import { useEffect } from 'react'
import { useStore } from 'react-redux'
import { type RootState, useAppDispatch, useAppSelector } from '../app/store'
import { setProjectUnchanged } from '../reducers/project-changed'
import { LoadingState, onLoadedProject, projectError } from '../reducers/project-state'
import { useVm } from './use-vm'

/** Sets up and starts the VM, and loads the default project into it once it is built. */
export const useVmManager = () => {
  const vm = useVm()
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()
  const started = useAppSelector((state) => state.scratchGui.vmStatus.started)
  const { loadingState, projectData } = useAppSelector((state) => state.scratchGui.projectState)

  useEffect(() => {
    // Read once: later locale and link mode changes reach the VM from the code that makes them
    const { locales, scratchGui } = store.getState()
    vm.setCompatibilityMode(true)
    void vm.setLocale(locales.locale, locales.messages)
    vm.link.setLinkMode(scratchGui.settings.linkMode)
    // The packs' remote import() lives in the app's build, which leaves it alone, rather than in the VM's
    vm.devices.setModuleImporter((url) => import(/* @vite-ignore */ url))
    void vm.devices.loadResourcePacks()
  }, [vm, store])

  useEffect(() => {
    if (!started) vm.start()
  }, [vm, started])

  useEffect(() => {
    // A file is loaded by the file uploader, so only the default project is loaded here
    if (loadingState !== LoadingState.LOADING_VM_NEW_DEFAULT || !projectData) return
    vm.project
      .load(projectData)
      .then(() => {
        dispatch(onLoadedProject(loadingState, true))
        // Project-changed events emitted while loading settle before the project is marked unchanged
        setTimeout(() => dispatch(setProjectUnchanged()))
      })
      .catch((error: unknown) => dispatch(projectError(error)))
  }, [vm, dispatch, loadingState, projectData])
}
