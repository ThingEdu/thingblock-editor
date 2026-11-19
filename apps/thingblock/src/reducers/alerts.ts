import type { ReactElement } from 'react'
import type { Dispatch } from 'redux'
import alertsData, { type AlertData, type AlertLevel, type AlertType, AlertTypes } from '../lib/alerts'

const SHOW_ALERT = 'scratch-gui/alerts/SHOW_ALERT'
const CLOSE_ALERT = 'scratch-gui/alerts/CLOSE_ALERT'
const CLOSE_ALERTS_WITH_ID = 'scratch-gui/alerts/CLOSE_ALERTS_WITH_ID'
const CLOSE_ALERT_WITH_ID = 'scratch-gui/alerts/CLOSE_ALERT_WITH_ID'

/** An alert being shown. */
export interface Alert {
  alertId?: string
  alertType?: AlertType
  closeButton?: boolean
  content?: ReactElement
  iconSpinner?: boolean
  iconURL?: string
  level: AlertLevel
  message?: string
  showDownload?: boolean
  showSaveNow?: boolean
}

export interface AlertsState {
  visible: boolean
  alertsList: Alert[]
}

type AlertsAction =
  | { type: typeof SHOW_ALERT; alertId: string; data?: AlertData }
  | { type: typeof CLOSE_ALERT; index: number }
  | { type: typeof CLOSE_ALERT_WITH_ID; alertId: string }
  | { type: typeof CLOSE_ALERTS_WITH_ID; alertId: string }

export const alertsInitialState: AlertsState = {
  visible: true,
  alertsList: [],
}

export const filterPopupAlerts = (alertsList: Alert[]) =>
  alertsList.filter((curAlert) => curAlert.alertType === AlertTypes.STANDARD)

export const filterInlineAlerts = (alertsList: Alert[]) =>
  alertsList.filter((curAlert) => curAlert.alertType === AlertTypes.INLINE)

const reducer = (state = alertsInitialState, action: AlertsAction): AlertsState => {
  switch (action.type) {
    case SHOW_ALERT: {
      const alertData = alertsData.find((thisAlertData) => thisAlertData.alertId === action.alertId)
      // If the alert is not found, show nothing
      if (!alertData) return state

      const newList = state.alertsList.filter((curAlert) => !alertData.clearList.includes(curAlert.alertId ?? ''))
      const data = action.data ?? {}
      newList.push({
        alertId: action.alertId,
        alertType: alertData.alertType ?? AlertTypes.STANDARD,
        closeButton: alertData.closeButton,
        content: typeof alertData.content === 'function' ? alertData.content(data) : alertData.content,
        iconURL: alertData.iconURL,
        iconSpinner: alertData.iconSpinner,
        level: alertData.level,
        message: data.message,
        showDownload: alertData.showDownload,
        showSaveNow: alertData.showSaveNow,
      })
      return { ...state, alertsList: newList }
    }
    case CLOSE_ALERT_WITH_ID:
    case CLOSE_ALERT: {
      const index =
        action.type === CLOSE_ALERT ? action.index : state.alertsList.findIndex((a) => a.alertId === action.alertId)
      if (index === -1) return state
      const newList = state.alertsList.slice()
      newList.splice(index, 1)
      return { ...state, alertsList: newList }
    }
    case CLOSE_ALERTS_WITH_ID:
      return { ...state, alertsList: state.alertsList.filter((curAlert) => curAlert.alertId !== action.alertId) }
    default:
      return state
  }
}

/**
 * Closes the alert at the given index.
 * @param index - The index of the alert to close.
 * @returns The action.
 */
export const closeAlert = (index: number): AlertsAction => ({ type: CLOSE_ALERT, index })

/**
 * Closes every alert with the given id.
 * @param alertId - The id of the alerts to close.
 * @returns The action.
 */
const closeAlertsWithId = (alertId: string): AlertsAction => ({ type: CLOSE_ALERTS_WITH_ID, alertId })

/**
 * Closes the first alert with the given id.
 * @param alertId - The id of the alert to close.
 * @returns The action.
 */
export const closeAlertWithId = (alertId: string): AlertsAction => ({ type: CLOSE_ALERT_WITH_ID, alertId })

/**
 * Shows the alert with the given id.
 * @param alertId - The id of the alert to show.
 * @param data - Data for alerts whose content is a function of it.
 * @returns The action.
 */
export const showStandardAlert = (alertId: string, data?: AlertData): AlertsAction => ({
  type: SHOW_ALERT,
  alertId,
  data,
})

/**
 * Shows an alert, and closes it after its `maxDisplaySecs` if it has one.
 * @param dispatch - The store's dispatch.
 * @param alertId - Which alert to show.
 * @param data - Data for alerts whose content is a function of it.
 */
export const showAlertWithTimeout = (dispatch: Dispatch<AlertsAction>, alertId: string, data?: AlertData) => {
  const alertData = alertsData.find((thisAlertData) => thisAlertData.alertId === alertId)
  if (!alertData) return

  dispatch(showStandardAlert(alertId, data))
  if (alertData.maxDisplaySecs) {
    setTimeout(() => {
      dispatch(closeAlertsWithId(alertId))
    }, alertData.maxDisplaySecs * 1000)
  }
}

export default reducer
