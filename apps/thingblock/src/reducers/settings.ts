import type { ColorMode } from '../lib/settings/color-mode'
import { detectColorMode } from '../lib/settings/color-mode/persistence'
import type { LinkMode } from '../lib/settings/link-mode'
import { detectLinkMode } from '../lib/settings/link-mode/persistence'
import type { Theme } from '../lib/settings/theme'
import { detectTheme } from '../lib/settings/theme/persistence'

const SET_COLOR_MODE = 'scratch-gui/settings/SET_COLOR_MODE'
const SET_LINK_MODE = 'scratch-gui/settings/SET_LINK_MODE'
const SET_THEME = 'scratch-gui/settings/SET_THEME'

export interface SettingsState {
  colorMode: ColorMode
  linkMode: LinkMode
  theme: Theme
}

type SettingsAction =
  | { type: typeof SET_COLOR_MODE; colorMode: ColorMode }
  | { type: typeof SET_LINK_MODE; linkMode: LinkMode }
  | { type: typeof SET_THEME; theme: Theme }

export const settingsInitialState: SettingsState = {
  colorMode: detectColorMode(),
  linkMode: detectLinkMode(),
  theme: detectTheme(),
}

const reducer = (state = settingsInitialState, action: SettingsAction): SettingsState => {
  switch (action.type) {
    case SET_COLOR_MODE:
      return { ...state, colorMode: action.colorMode }
    case SET_LINK_MODE:
      return { ...state, linkMode: action.linkMode }
    case SET_THEME:
      return { ...state, theme: action.theme }
    default:
      return state
  }
}

export const setColorMode = (colorMode: ColorMode): SettingsAction => ({ type: SET_COLOR_MODE, colorMode })

export const setLinkMode = (linkMode: LinkMode): SettingsAction => ({ type: SET_LINK_MODE, linkMode })

export const setTheme = (theme: Theme): SettingsAction => ({ type: SET_THEME, theme })

export default reducer
