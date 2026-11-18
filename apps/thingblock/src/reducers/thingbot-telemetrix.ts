const THINGBOT_LOADED = 'scratch-gui/thingbot-telemetrix/LOADED'
const THINGBOT_CONNECT_START = 'scratch-gui/thingbot-telemetrix/CONNECT_START'
const THINGBOT_CONNECT_SUCCESS = 'scratch-gui/thingbot-telemetrix/CONNECT_SUCCESS'
const THINGBOT_DISCONNECT = 'scratch-gui/thingbot-telemetrix/DISCONNECT'

export interface ThingbotTelemetrixState {
  loaded: boolean
  connected: boolean
  connecting: boolean
}

interface ThingbotTelemetrixAction {
  type:
    | typeof THINGBOT_LOADED
    | typeof THINGBOT_CONNECT_START
    | typeof THINGBOT_CONNECT_SUCCESS
    | typeof THINGBOT_DISCONNECT
}

export const thingbotTelemetrixInitialState: ThingbotTelemetrixState = {
  loaded: false,
  connected: false,
  connecting: false,
}

const reducer = (
  state = thingbotTelemetrixInitialState,
  action: ThingbotTelemetrixAction,
): ThingbotTelemetrixState => {
  switch (action.type) {
    case THINGBOT_LOADED:
      return { ...state, loaded: true }
    case THINGBOT_CONNECT_START:
      return { ...state, connecting: true, connected: false }
    case THINGBOT_CONNECT_SUCCESS:
      return { ...state, connecting: false, connected: true }
    case THINGBOT_DISCONNECT:
      return { ...state, connecting: false, connected: false }
    default:
      return state
  }
}

export const thingbotLoaded = (): ThingbotTelemetrixAction => ({ type: THINGBOT_LOADED })
export const thingbotConnectStart = (): ThingbotTelemetrixAction => ({ type: THINGBOT_CONNECT_START })
export const thingbotConnectSuccess = (): ThingbotTelemetrixAction => ({ type: THINGBOT_CONNECT_SUCCESS })
export const thingbotDisconnect = (): ThingbotTelemetrixAction => ({ type: THINGBOT_DISCONNECT })

export default reducer
