import VM from '@thingblock/thingblock-vm'

const SET_VM = 'scratch-gui/vm/SET_VM'

interface VmAction {
  type: typeof SET_VM
  vm: VM
}

export const vmInitialState = (): VM => new VM()

const reducer = (state: VM | null = null, action: VmAction): VM | null => {
  switch (action.type) {
    case SET_VM:
      return action.vm
    default:
      return state
  }
}

export const setVM = (vm: VM): VmAction => ({ type: SET_VM, vm })

export default reducer
