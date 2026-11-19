import { expect, test } from 'vitest'
import { AlertLevels } from '../../src/lib/alerts'
import alertsReducer, {
  type Alert,
  type AlertsState,
  closeAlert,
  closeAlertWithId,
  showStandardAlert,
} from '../../src/reducers/alerts'

const errorAlert: Alert = {
  alertId: 'saveToFileError',
  level: AlertLevels.WARN,
  iconURL: '/no_image_here.jpg',
}

const withAlerts = (alertsList: Alert[]): AlertsState => ({ visible: true, alertsList })

test('create one standard alert', () => {
  const resultState = alertsReducer(undefined, showStandardAlert('savedToFile'))
  expect(resultState.alertsList.length).toBe(1)
  expect(resultState.alertsList[0].alertId).toBe('savedToFile')
  expect(resultState.alertsList[0].level).toBe(AlertLevels.SUCCESS)
})

test('add several standard alerts', () => {
  const action = showStandardAlert('savedToFile')
  let resultState = alertsReducer(withAlerts([errorAlert]), action)
  resultState = alertsReducer(resultState, action)
  resultState = alertsReducer(resultState, action)
  expect(resultState.alertsList.length).toBe(1)
  expect(resultState.alertsList[0].iconURL).not.toBe('/no_image_here.jpg')
  expect(resultState.alertsList[0].alertId).toBe('savedToFile')
})

test('alert content can depend on the data it is shown with', () => {
  const resultState = alertsReducer(undefined, showStandardAlert('savedToFile', { path: '/tmp/a.tb' }))
  expect(resultState.alertsList[0].content?.props).toMatchObject({ values: { path: '/tmp/a.tb' } })
})

test('an unknown alert id shows nothing', () => {
  expect(alertsReducer(undefined, showStandardAlert('noSuchAlert')).alertsList).toEqual([])
})

test('can close alerts by index', () => {
  let resultState = alertsReducer(withAlerts([errorAlert]), closeAlert(0))
  expect(resultState.alertsList.length).toBe(0)
  resultState = alertsReducer(resultState, showStandardAlert('savedToFile'))
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
  const otherAlert: Alert = { ...errorAlert, alertId: 'other' }
  const resultState = alertsReducer(withAlerts([errorAlert, otherAlert]), showStandardAlert('savedToFile'))
  expect(resultState.alertsList.map((a) => a.alertId)).toEqual(['other', 'savedToFile'])
})

test('several related alerts can be cleared at once', () => {
  const savedAction = showStandardAlert('savedToFile')
  let resultState = alertsReducer(undefined, savedAction)
  resultState = alertsReducer(resultState, savedAction)
  resultState = alertsReducer(resultState, savedAction)
  resultState = alertsReducer(resultState, showStandardAlert('saveToFileError'))
  expect(resultState.alertsList.map((a) => a.alertId)).toEqual(['saveToFileError'])
})
