const SET_DEVICE = 'scratch-gui/board/SET_DEVICE'
const SET_CONNECTED_BOARD = 'scratch-gui/board/SET_CONNECTED_BOARD'

/** A connected board target. */
export interface ConnectedBoard {
  id: string
  name: string
}

export interface BoardState {
  selectedDeviceId: string | null
  /** The connected board target, or null when no board is connected. */
  connectedBoard: ConnectedBoard | null
}

type BoardAction =
  | { type: typeof SET_DEVICE; deviceId: string | null }
  | { type: typeof SET_CONNECTED_BOARD; board: ConnectedBoard | null }

export const boardInitialState: BoardState = {
  selectedDeviceId: null,
  connectedBoard: null,
}

const reducer = (state = boardInitialState, action: BoardAction): BoardState => {
  switch (action.type) {
    case SET_DEVICE:
      return { ...state, selectedDeviceId: action.deviceId }
    case SET_CONNECTED_BOARD:
      return { ...state, connectedBoard: action.board }
    default:
      return state
  }
}

export const setDevice = (deviceId: string | null): BoardAction => ({ type: SET_DEVICE, deviceId })

export const setConnectedBoard = (board: ConnectedBoard | null): BoardAction => ({ type: SET_CONNECTED_BOARD, board })

export default reducer
