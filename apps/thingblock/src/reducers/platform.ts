import { PLATFORM, type Platform } from '../lib/platform'

const SET_PLATFORM = 'scratch-gui/Platform/SET_PLATFORM'

export interface PlatformState {
  platform: Platform
}

interface PlatformAction {
  type: typeof SET_PLATFORM
  platform: Platform
}

export const platformInitialState: PlatformState = {
  platform: PLATFORM.WEB,
}

const reducer = (state = platformInitialState, action: PlatformAction): PlatformState => {
  switch (action.type) {
    case SET_PLATFORM:
      return { platform: action.platform }
    default:
      return state
  }
}

export const setPlatform = (platform: Platform): PlatformAction => ({ type: SET_PLATFORM, platform })

export default reducer
