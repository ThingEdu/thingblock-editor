const EXTENSION_LOADED = 'scratch-gui/loaded-extensions/EXTENSION_LOADED'

/** The ids of the extensions in the project; the VM never unloads one, so ids are only added. */
export type LoadedExtensionsState = string[]

interface LoadedExtensionsAction {
  type: typeof EXTENSION_LOADED
  extensionId: string
}

export const loadedExtensionsInitialState: LoadedExtensionsState = []

const reducer = (state = loadedExtensionsInitialState, action: LoadedExtensionsAction): LoadedExtensionsState => {
  switch (action.type) {
    case EXTENSION_LOADED:
      return state.includes(action.extensionId) ? state : [...state, action.extensionId]
    default:
      return state
  }
}

export const extensionLoaded = (extensionId: string): LoadedExtensionsAction => ({
  type: EXTENSION_LOADED,
  extensionId,
})

export default reducer
