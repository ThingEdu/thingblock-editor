const RESTORE_UPDATE = 'scratch-gui/restore-deletion/RESTORE_UPDATE'

export interface RestoreDeletionState {
  restoreFun: (() => void) | null
  deletedItem: string
}

interface RestoreDeletionAction {
  type: typeof RESTORE_UPDATE
  state: RestoreDeletionState
}

export const restoreDeletionInitialState: RestoreDeletionState = {
  restoreFun: null,
  deletedItem: '',
}

const reducer = (state = restoreDeletionInitialState, action: RestoreDeletionAction): RestoreDeletionState => {
  switch (action.type) {
    case RESTORE_UPDATE:
      return { ...state, ...action.state }
    default:
      return state
  }
}

export const setRestore = (state: RestoreDeletionState): RestoreDeletionAction => ({
  type: RESTORE_UPDATE,
  state: {
    restoreFun: state.restoreFun,
    deletedItem: state.deletedItem,
  },
})

export default reducer
