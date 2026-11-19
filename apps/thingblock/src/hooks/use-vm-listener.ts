import { useEffect } from 'react'
import { useAppDispatch } from '../app/store'
import { setDevice } from '../reducers/board'
import { cameraAiLoaded } from '../reducers/camera-ai'
import { setProjectChanged } from '../reducers/project-changed'
import { setRunningState, setStartedState, setTurboState } from '../reducers/vm-status'
import { useVm } from './use-vm'

const keyOf = (event: KeyboardEvent) => (!event.key || event.key === 'Dead' ? event.keyCode : event.key)

/** Forwards the VM's events into Redux, and the page's key presses into the VM. */
export const useVmListener = () => {
  const vm = useVm()
  const dispatch = useAppDispatch()

  useEffect(() => {
    const handlers: Record<string, Parameters<typeof vm.events.on>[1]> = {
      TURBO_MODE_ON: () => dispatch(setTurboState(true)),
      TURBO_MODE_OFF: () => dispatch(setTurboState(false)),
      PROJECT_RUN_START: () => dispatch(setRunningState(true)),
      PROJECT_RUN_STOP: () => dispatch(setRunningState(false)),
      RUNTIME_STARTED: () => dispatch(setStartedState(true)),
      PROJECT_CHANGED: () => dispatch(setProjectChanged()),
      // The Camera AI playground panel shows once its extension is in the project
      EXTENSION_ADDED: (categoryInfo: { id: string }) => {
        if (categoryInfo.id === 'cameraAi') dispatch(cameraAiLoaded())
      },
      // A loaded project carries its board; selecting it puts the editor in (or out of) board mode to match
      BOARD_RESTORED: (board: { device: string | null }) => dispatch(setDevice(board.device)),
    }
    for (const [name, handler] of Object.entries(handlers)) vm.events.on(name, handler)
    return () => {
      for (const [name, handler] of Object.entries(handlers)) vm.events.off(name, handler)
    }
  }, [vm, dispatch])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Keys typed into HTML inputs (the project title, say) are not for the project. The Blockly workspace is SVG,
      // so keys pressed while a block has focus still reach it, and game controls work from the Code tab.
      if (event.target !== document && event.target !== document.body && !(event.target instanceof SVGElement)) {
        return
      }
      vm.postIOData('keyboard', { key: keyOf(event), isDown: true })
      // Space and the arrow keys would scroll the page
      if (event.keyCode === 32 || (event.keyCode >= 37 && event.keyCode <= 40)) event.preventDefault()
    }
    // Every release goes to the VM, even one whose key went down in an input, so no key stays held
    const handleKeyUp = (event: KeyboardEvent) => {
      vm.postIOData('keyboard', { key: keyOf(event), isDown: false })
      if (event.target !== document && event.target !== document.body) event.preventDefault()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [vm])
}
