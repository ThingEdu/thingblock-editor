const SET_ID = 'scratch-gui/connection-modal/setId'

export interface ConnectionModalState {
  extensionId: string | null
}

interface ConnectionModalAction {
  type: typeof SET_ID
  extensionId: string | null
}

export const connectionModalInitialState: ConnectionModalState = {
  extensionId: null,
}

const reducer = (state = connectionModalInitialState, action: ConnectionModalAction): ConnectionModalState => {
  switch (action.type) {
    case SET_ID:
      return { ...state, extensionId: action.extensionId }
    default:
      return state
  }
}

export const setConnectionModalExtensionId = (extensionId: string | null): ConnectionModalAction => ({
  type: SET_ID,
  extensionId,
})

export default reducer
