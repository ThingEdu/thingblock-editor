const SET_GENERATED_CODE = 'scratch-gui/code/SET_GENERATED_CODE'

export interface CodeState {
  /**
   * The Arduino C++ source generated from the current workspace, shown in the device panel's code view.
   * Empty in host mode (no board selected).
   */
  generatedCode: string
}

interface CodeAction {
  type: typeof SET_GENERATED_CODE
  code: string
}

export const codeInitialState: CodeState = {
  generatedCode: '',
}

const reducer = (state = codeInitialState, action: CodeAction): CodeState => {
  switch (action.type) {
    case SET_GENERATED_CODE:
      return { ...state, generatedCode: action.code }
    default:
      return state
  }
}

export const setGeneratedCode = (code: string): CodeAction => ({ type: SET_GENERATED_CODE, code })

export default reducer
