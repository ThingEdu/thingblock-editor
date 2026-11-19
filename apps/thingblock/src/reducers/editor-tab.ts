const ACTIVATE_TAB = 'scratch-gui/navigation/ACTIVATE_TAB'

// Constants use numbers to make it easier to work with react-tabs
export const BLOCKS_TAB_INDEX = 0

export interface EditorTabState {
  activeTabIndex: number
}

interface EditorTabAction {
  type: typeof ACTIVATE_TAB
  activeTabIndex: number
}

export const editorTabInitialState: EditorTabState = {
  activeTabIndex: BLOCKS_TAB_INDEX,
}

const reducer = (state = editorTabInitialState, action: EditorTabAction): EditorTabState => {
  switch (action.type) {
    case ACTIVATE_TAB:
      return { ...state, activeTabIndex: action.activeTabIndex }
    default:
      return state
  }
}

export const activateTab = (tab: number): EditorTabAction => ({ type: ACTIVATE_TAB, activeTabIndex: tab })

export default reducer
