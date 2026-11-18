const CAMERA_AI_LOADED = 'scratch-gui/camera-ai/LOADED'

export interface CameraAiState {
  /** The Camera AI extension is in the project, so the playground panel shows. */
  loaded: boolean
}

interface CameraAiAction {
  type: typeof CAMERA_AI_LOADED
}

export const cameraAiInitialState: CameraAiState = {
  loaded: false,
}

const reducer = (state = cameraAiInitialState, action: CameraAiAction): CameraAiState => {
  switch (action.type) {
    case CAMERA_AI_LOADED:
      return { ...state, loaded: true }
    default:
      return state
  }
}

export const cameraAiLoaded = (): CameraAiAction => ({ type: CAMERA_AI_LOADED })

export default reducer
