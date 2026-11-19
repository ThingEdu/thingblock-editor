import type VM from '@thingblock/thingblock-vm'
import { useAppSelector } from '../app/store'

/**
 * Reads the VM from the store.
 * @returns The editor's VM.
 */
export const useVm = (): VM => {
  const vm = useAppSelector((state) => state.scratchGui.vm)
  if (!vm) throw new Error('useVm: the store has no VM')
  return vm
}
