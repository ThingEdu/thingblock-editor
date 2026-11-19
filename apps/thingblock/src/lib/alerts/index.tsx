import type { ReactElement } from 'react'
import { FormattedMessage } from 'react-intl'
import failImage from '../assets/icon--error.svg'
import successImage from '../assets/icon--success.svg'

export const AlertTypes = {
  STANDARD: 'STANDARD',
  INLINE: 'INLINE',
} as const

export type AlertType = (typeof AlertTypes)[keyof typeof AlertTypes]

export const AlertLevels = {
  SUCCESS: 'success',
  INFO_BLUE: 'info-blue',
  INFO: 'info',
  WARN: 'warn',
} as const

export type AlertLevel = (typeof AlertLevels)[keyof typeof AlertLevels]

/** Data an alert is shown with. */
export interface AlertData {
  message?: string
  path?: string
}

/** The definition of a standard or inline alert. */
export interface AlertDefinition {
  alertId: string
  alertType?: AlertType
  clearList: string[]
  closeButton?: boolean
  /** An alert whose text depends on the moment (e.g. the path a project was saved to) is a function of its data. */
  content: ReactElement | ((data: AlertData) => ReactElement)
  iconSpinner?: boolean
  iconURL?: string
  level: AlertLevel
  maxDisplaySecs?: number
  showDownload?: boolean
  showSaveNow?: boolean
}

const alerts: AlertDefinition[] = [
  {
    alertId: 'savedToFile',
    alertType: AlertTypes.STANDARD,
    clearList: ['savedToFile', 'saveToFileError'],
    closeButton: true,
    content: ({ path }) => (
      <FormattedMessage
        defaultMessage="Saved: {path}"
        description="Message shown after the project was written to a file the user chose"
        id="gui.alerts.savedToFile"
        values={{ path }}
      />
    ),
    iconURL: successImage,
    level: AlertLevels.SUCCESS,
    maxDisplaySecs: 6,
  },
  {
    alertId: 'saveToFileError',
    alertType: AlertTypes.STANDARD,
    clearList: ['savedToFile', 'saveToFileError'],
    closeButton: true,
    content: ({ message }) => (
      <FormattedMessage
        defaultMessage="Couldn’t save the project: {message}"
        description="Message shown when writing the project to a file failed"
        id="gui.alerts.saveToFileError"
        values={{ message }}
      />
    ),
    iconURL: failImage,
    level: AlertLevels.WARN,
    maxDisplaySecs: 10,
  },
]

export default alerts
