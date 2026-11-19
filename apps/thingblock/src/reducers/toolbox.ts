import makeToolboxXML from '../lib/blocks/make-toolbox-xml'

const UPDATE_TOOLBOX = 'scratch-gui/toolbox/UPDATE_TOOLBOX'

export interface ToolboxState {
  toolboxXML: string
}

interface ToolboxAction {
  type: typeof UPDATE_TOOLBOX
  toolboxXML: string
}

export const toolboxInitialState: ToolboxState = {
  toolboxXML: makeToolboxXML(true),
}

const reducer = (state = toolboxInitialState, action: ToolboxAction): ToolboxState => {
  switch (action.type) {
    case UPDATE_TOOLBOX:
      return { ...state, toolboxXML: action.toolboxXML }
    default:
      return state
  }
}

export const updateToolbox = (toolboxXML: string): ToolboxAction => ({ type: UPDATE_TOOLBOX, toolboxXML })

export default reducer
