import { expect, test } from 'vitest'
import { AlertLevels, AlertTypes } from '../../src/lib/alerts'
import alertsReducer, {
  type Alert,
  type AlertsState,
  closeAlert,
  closeAlertWithId,
  filterInlineAlerts,
  filterPopupAlerts,
  showExtensionAlert,
  showStandardAlert,
} from '../../src/reducers/alerts'

const unrelatedAction = { type: 'anything' } as unknown as ReturnType<typeof closeAlert>

const savingAlert: Alert = {
  alertId: 'saving',
  alertType: AlertTypes.INLINE,
  level: AlertLevels.SUCCESS,
  iconURL: '/no_image_here.jpg',
}

const withAlerts = (alertsList: Alert[]): AlertsState => ({ visible: true, alertsList })

test('initialState', () => {
  expect(alertsReducer(undefined, unrelatedAction)).toEqual({ visible: true, alertsList: [] })
})

test('create one standard alert', () => {
  const resultState = alertsReducer(undefined, showStandardAlert('creatingCopy'))
  expect(resultState.alertsList.length).toBe(1)
  expect(resultState.alertsList[0].alertId).toBe('creatingCopy')
  expect(resultState.alertsList[0].alertType).toBe(AlertTypes.STANDARD)
  expect(resultState.alertsList[0].level).toBe(AlertLevels.SUCCESS)
})

test('add several standard alerts', () => {
  const action = showStandardAlert('creatingCopy')
  let resultState = alertsReducer(withAlerts([savingAlert]), action)
  resultState = alertsReducer(resultState, action)
  resultState = alertsReducer(resultState, action)
  expect(resultState.alertsList.length).toBe(1)
  expect(resultState.alertsList[0].alertType).toBe(AlertTypes.STANDARD)
  expect(resultState.alertsList[0].iconURL).not.toBe('/no_image_here.jpg')
  expect(resultState.alertsList[0].alertId).toBe('creatingCopy')
})

test('create one inline alert message', () => {
  const resultState = alertsReducer(undefined, showStandardAlert('saving'))
  expect(resultState.alertsList.length).toBe(1)
  expect(resultState.alertsList[0].alertId).toBe('saving')
  expect(resultState.alertsList[0].alertType).toBe(AlertTypes.INLINE)
  expect(resultState.alertsList[0].level).toBe(AlertLevels.INFO)
})

test('alert content can depend on the data it is shown with', () => {
  const resultState = alertsReducer(undefined, showStandardAlert('savedToFile', { path: '/tmp/a.tb' }))
  expect(resultState.alertsList[0].content?.props).toMatchObject({ values: { path: '/tmp/a.tb' } })
})

test('an unknown alert id shows nothing', () => {
  expect(alertsReducer(undefined, showStandardAlert('noSuchAlert')).alertsList).toEqual([])
})

test('can close alerts by index', () => {
  let resultState = alertsReducer(withAlerts([savingAlert]), closeAlert(0))
  expect(resultState.alertsList.length).toBe(0)
  resultState = alertsReducer(resultState, showStandardAlert('creatingCopy'))
  expect(resultState.alertsList.length).toBe(1)
})

test('can close a single alert by id', () => {
  const alert = (alertId: string): Alert => ({ alertId, level: AlertLevels.INFO })
  const closeAction = closeAlertWithId('saving')
  let resultState = alertsReducer(
    withAlerts([alert('saving'), alert('creatingCopy'), alert('saving'), alert('saving')]),
    closeAction,
  )
  expect(resultState.alertsList.map((a) => a.alertId)).toEqual(['creatingCopy', 'saving', 'saving'])
  resultState = alertsReducer(resultState, closeAction)
  expect(resultState.alertsList.map((a) => a.alertId)).toEqual(['creatingCopy', 'saving'])
  resultState = alertsReducer(resultState, closeAction)
  expect(resultState.alertsList.map((a) => a.alertId)).toEqual(['creatingCopy'])
  resultState = alertsReducer(resultState, closeAction)
  expect(resultState.alertsList.map((a) => a.alertId)).toEqual(['creatingCopy'])
})

test('related alerts can clear each other', () => {
  const creatingAlert: Alert = { ...savingAlert, alertId: 'creatingCopy', alertType: AlertTypes.STANDARD }
  const resultState = alertsReducer(withAlerts([savingAlert, creatingAlert]), showStandardAlert('saveSuccess'))
  expect(resultState.alertsList.map((a) => a.alertId)).toEqual(['creatingCopy', 'saveSuccess'])
})

test('several related alerts can be cleared at once', () => {
  const createAction = showStandardAlert('creatingCopy')
  let resultState = alertsReducer(undefined, createAction)
  resultState = alertsReducer(resultState, createAction)
  resultState = alertsReducer(resultState, createAction)
  resultState = alertsReducer(resultState, showStandardAlert('createCopySuccess'))
  expect(resultState.alertsList.map((a) => a.alertId)).toEqual(['createCopySuccess'])
})

test('showExtensionAlert adds a reconnect alert for a known extension', () => {
  const resultState = alertsReducer(undefined, showExtensionAlert({ extensionId: 'thingbotTelemetrix' }))
  expect(resultState.alertsList).toEqual([
    expect.objectContaining({
      alertType: AlertTypes.EXTENSION,
      extensionId: 'thingbotTelemetrix',
      extensionName: 'ThingBot Telemetrix',
      showReconnect: true,
    }),
  ])
  expect(alertsReducer(undefined, showExtensionAlert({ extensionId: 'noSuchExtension' })).alertsList).toEqual([])
})

const mixedAlerts: Alert[] = [
  { alertId: 'extension', alertType: AlertTypes.EXTENSION, level: AlertLevels.WARN },
  { alertId: 'inline', alertType: AlertTypes.INLINE, level: AlertLevels.WARN },
  { alertId: 'standard', alertType: AlertTypes.STANDARD, level: AlertLevels.WARN },
]

test('filterInlineAlerts only returns inline type alerts', () => {
  expect(filterInlineAlerts(mixedAlerts).map((a) => a.alertId)).toEqual(['inline'])
})

test('filterPopupAlerts returns standard and extension type alerts', () => {
  expect(filterPopupAlerts(mixedAlerts).map((a) => a.alertId)).toEqual(['extension', 'standard'])
})
