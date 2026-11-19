const SET_RUNNING_STATE = 'scratch-gui/vm-status/SET_RUNNING_STATE'
const SET_TURBO_STATE = 'scratch-gui/vm-status/SET_TURBO_STATE'
const SET_STARTED_STATE = 'scratch-gui/vm-status/SET_STARTED_STATE'

export interface VmStatusState {
  running: boolean
  started: boolean
  turbo: boolean
}

type VmStatusAction =
  | { type: typeof SET_STARTED_STATE; started: boolean }
  | { type: typeof SET_RUNNING_STATE; running: boolean }
  | { type: typeof SET_TURBO_STATE; turbo: boolean }

export const vmStatusInitialState: VmStatusState = {
  running: false,
  started: false,
  turbo: false,
}

const reducer = (state = vmStatusInitialState, action: VmStatusAction): VmStatusState => {
  switch (action.type) {
    case SET_STARTED_STATE:
      return { ...state, started: action.started }
    case SET_RUNNING_STATE:
      return { ...state, running: action.running }
    case SET_TURBO_STATE:
      return { ...state, turbo: action.turbo }
    default:
      return state
  }
}

export const setStartedState = (started: boolean): VmStatusAction => ({ type: SET_STARTED_STATE, started })

export const setRunningState = (running: boolean): VmStatusAction => ({ type: SET_RUNNING_STATE, running })

export const setTurboState = (turbo: boolean): VmStatusAction => ({ type: SET_TURBO_STATE, turbo })

export default reducer
