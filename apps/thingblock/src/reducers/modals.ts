const OPEN_MODAL = 'scratch-gui/modals/OPEN_MODAL'
const CLOSE_MODAL = 'scratch-gui/modals/CLOSE_MODAL'

export const MODAL_BOARD_LIBRARY = 'boardLibrary'
export const MODAL_DEBUG = 'debugModal'
export const MODAL_EXAMPLE_LIBRARY = 'exampleLibrary'
export const MODAL_EXTENSION_LIBRARY = 'extensionLibrary'
export const MODAL_LOADING_PROJECT = 'loadingProject'
export const MODAL_PERIPHERAL_LIBRARY = 'peripheralLibrary'
export const MODAL_CONNECTION = 'connectionModal'
export const MODAL_SETTINGS = 'settingsModal'
export const MODAL_TIPS_LIBRARY = 'tipsLibrary'

export type Modal =
  | typeof MODAL_BOARD_LIBRARY
  | typeof MODAL_DEBUG
  | typeof MODAL_EXAMPLE_LIBRARY
  | typeof MODAL_EXTENSION_LIBRARY
  | typeof MODAL_LOADING_PROJECT
  | typeof MODAL_PERIPHERAL_LIBRARY
  | typeof MODAL_CONNECTION
  | typeof MODAL_SETTINGS
  | typeof MODAL_TIPS_LIBRARY

/** Whether each modal is open. */
export type ModalsState = Record<Modal, boolean>

interface ModalsAction {
  type: typeof OPEN_MODAL | typeof CLOSE_MODAL
  modal: Modal
}

export const modalsInitialState: ModalsState = {
  [MODAL_BOARD_LIBRARY]: false,
  [MODAL_DEBUG]: false,
  [MODAL_EXAMPLE_LIBRARY]: false,
  [MODAL_EXTENSION_LIBRARY]: false,
  [MODAL_LOADING_PROJECT]: false,
  [MODAL_PERIPHERAL_LIBRARY]: false,
  [MODAL_CONNECTION]: false,
  [MODAL_SETTINGS]: false,
  [MODAL_TIPS_LIBRARY]: false,
}

const reducer = (state = modalsInitialState, action: ModalsAction): ModalsState => {
  switch (action.type) {
    case OPEN_MODAL:
      return { ...state, [action.modal]: true }
    case CLOSE_MODAL:
      return { ...state, [action.modal]: false }
    default:
      return state
  }
}

const openModal = (modal: Modal): ModalsAction => ({ type: OPEN_MODAL, modal })
const closeModal = (modal: Modal): ModalsAction => ({ type: CLOSE_MODAL, modal })

export const openBoardLibrary = () => openModal(MODAL_BOARD_LIBRARY)
export const openDebugModal = () => openModal(MODAL_DEBUG)
export const openExampleLibrary = () => openModal(MODAL_EXAMPLE_LIBRARY)
export const openExtensionLibrary = () => openModal(MODAL_EXTENSION_LIBRARY)
export const openLoadingProject = () => openModal(MODAL_LOADING_PROJECT)
export const openPeripheralLibrary = () => openModal(MODAL_PERIPHERAL_LIBRARY)
export const openConnectionModal = () => openModal(MODAL_CONNECTION)
export const openSettingsModal = () => openModal(MODAL_SETTINGS)
export const openTipsLibrary = () => openModal(MODAL_TIPS_LIBRARY)
export const closeBoardLibrary = () => closeModal(MODAL_BOARD_LIBRARY)
export const closeDebugModal = () => closeModal(MODAL_DEBUG)
export const closeExampleLibrary = () => closeModal(MODAL_EXAMPLE_LIBRARY)
export const closeExtensionLibrary = () => closeModal(MODAL_EXTENSION_LIBRARY)
export const closeLoadingProject = () => closeModal(MODAL_LOADING_PROJECT)
export const closePeripheralLibrary = () => closeModal(MODAL_PERIPHERAL_LIBRARY)
export const closeConnectionModal = () => closeModal(MODAL_CONNECTION)
export const closeSettingsModal = () => closeModal(MODAL_SETTINGS)
export const closeTipsLibrary = () => closeModal(MODAL_TIPS_LIBRARY)

export default reducer
