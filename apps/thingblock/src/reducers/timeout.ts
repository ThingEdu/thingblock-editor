const SET_AUTOSAVE_TIMEOUT_ID = 'timeout/SET_AUTOSAVE_TIMEOUT_ID'

export interface TimeoutState {
  autoSaveTimeoutId: number | null
}

interface TimeoutAction {
  type: typeof SET_AUTOSAVE_TIMEOUT_ID
  id: number | null
}

export const timeoutInitialState: TimeoutState = {
  autoSaveTimeoutId: null,
}

const reducer = (state = timeoutInitialState, action: TimeoutAction): TimeoutState => {
  switch (action.type) {
    case SET_AUTOSAVE_TIMEOUT_ID:
      return { ...state, autoSaveTimeoutId: action.id }
    default:
      return state
  }
}

export const setAutoSaveTimeoutId = (id: number | null): TimeoutAction => ({ type: SET_AUTOSAVE_TIMEOUT_ID, id })

export default reducer
