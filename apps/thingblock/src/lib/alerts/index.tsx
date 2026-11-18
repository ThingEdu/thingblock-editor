import type { ReactElement } from 'react'
import { FormattedMessage } from 'react-intl'
import failImage from '../assets/icon--error.svg'
import successImage from '../assets/icon--success.svg'

export const AlertTypes = {
  STANDARD: 'STANDARD',
  EXTENSION: 'EXTENSION',
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

const projectAlerts = [
  'createCopySuccess',
  'creatingCopy',
  'createRemixSuccess',
  'creatingRemix',
  'saveSuccess',
  'saving',
]

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
  {
    alertId: 'createCopySuccess',
    alertType: AlertTypes.STANDARD,
    clearList: projectAlerts,
    content: (
      <FormattedMessage
        defaultMessage="Project saved as a copy."
        description="Message indicating that project was successfully created"
        id="gui.alerts.createcopysuccess"
      />
    ),
    iconURL: successImage,
    level: AlertLevels.SUCCESS,
    maxDisplaySecs: 5,
  },
  {
    alertId: 'createRemixSuccess',
    alertType: AlertTypes.STANDARD,
    clearList: projectAlerts,
    content: (
      <FormattedMessage
        defaultMessage="Project saved as a remix."
        description="Message indicating that project was successfully created"
        id="gui.alerts.createremixsuccess"
      />
    ),
    iconURL: successImage,
    level: AlertLevels.SUCCESS,
    maxDisplaySecs: 5,
  },
  {
    alertId: 'creatingCopy',
    alertType: AlertTypes.STANDARD,
    clearList: projectAlerts,
    content: (
      <FormattedMessage
        defaultMessage="Copying project…"
        description="Message indicating that project is in process of copying"
        id="gui.alerts.creatingCopy"
      />
    ),
    iconSpinner: true,
    level: AlertLevels.SUCCESS,
  },
  {
    alertId: 'creatingRemix',
    alertType: AlertTypes.STANDARD,
    clearList: projectAlerts,
    content: (
      <FormattedMessage
        defaultMessage="Remixing project…"
        description="Message indicating that project is in process of remixing"
        id="gui.alerts.creatingRemix"
      />
    ),
    iconSpinner: true,
    level: AlertLevels.SUCCESS,
  },
  {
    alertId: 'creatingError',
    clearList: projectAlerts,
    closeButton: true,
    content: (
      <FormattedMessage
        defaultMessage="Could not create the project. Please try again!"
        description="Message indicating that project could not be created"
        id="gui.alerts.creatingError"
      />
    ),
    level: AlertLevels.WARN,
  },
  {
    alertId: 'savingError',
    clearList: projectAlerts,
    showDownload: true,
    showSaveNow: true,
    closeButton: false,
    content: (
      <FormattedMessage
        defaultMessage="Project could not save."
        description="Message indicating that project could not be saved"
        id="gui.alerts.savingError"
      />
    ),
    level: AlertLevels.WARN,
  },
  {
    alertId: 'saveSuccess',
    alertType: AlertTypes.INLINE,
    clearList: ['saveSuccess', 'saving', 'savingError'],
    content: (
      <FormattedMessage
        defaultMessage="Project saved."
        description="Message indicating that project was successfully saved"
        id="gui.alerts.savesuccess"
      />
    ),
    iconURL: successImage,
    level: AlertLevels.SUCCESS,
    maxDisplaySecs: 3,
  },
  {
    alertId: 'saving',
    alertType: AlertTypes.INLINE,
    clearList: ['saveSuccess', 'saving', 'savingError'],
    content: (
      <FormattedMessage
        defaultMessage="Saving project…"
        description="Message indicating that project is in process of saving"
        id="gui.alerts.saving"
      />
    ),
    iconSpinner: true,
    level: AlertLevels.INFO,
  },
  {
    alertId: 'loadingExtensionData',
    alertType: AlertTypes.STANDARD,
    clearList: ['loadingExtensionData'],
    content: (
      <FormattedMessage
        defaultMessage="Loading extension..."
        description="Message indicating that extension is in process of loading"
        id="gui.alerts.loadingExtensionData"
      />
    ),
    iconSpinner: true,
    level: AlertLevels.SUCCESS,
  },
]

export default alerts
