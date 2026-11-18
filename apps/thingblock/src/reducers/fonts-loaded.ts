const SET_FONTS_LOADED = 'fontsLoaded/SET_FONTS_LOADED'

interface FontsLoadedAction {
  type: typeof SET_FONTS_LOADED
  loaded: boolean
}

export const fontsLoadedInitialState = false

const reducer = (state = fontsLoadedInitialState, action: FontsLoadedAction): boolean => {
  switch (action.type) {
    case SET_FONTS_LOADED:
      return action.loaded
    default:
      return state
  }
}

export const setFontsLoaded = (): FontsLoadedAction => ({ type: SET_FONTS_LOADED, loaded: true })

export default reducer
