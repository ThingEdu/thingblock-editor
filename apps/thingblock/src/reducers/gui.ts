import { combineReducers } from 'redux'
import alertsReducer, { alertsInitialState } from './alerts'
import boardReducer, { boardInitialState } from './board'
import cameraAiReducer, { cameraAiInitialState } from './camera-ai'
import codeReducer, { codeInitialState } from './code'
import connectionModalReducer, { connectionModalInitialState } from './connection-modal'
import customProceduresReducer, { customProceduresInitialState } from './custom-procedures'
import editorTabReducer, { editorTabInitialState } from './editor-tab'
import modalReducer, { modalsInitialState } from './modals'
import platformReducer, { platformInitialState } from './platform'
import projectChangedReducer, { projectChangedInitialState } from './project-changed'
import projectStateReducer, { projectStateInitialState } from './project-state'
import projectTitleReducer, { projectTitleInitialState } from './project-title'
import restoreDeletionReducer, { restoreDeletionInitialState } from './restore-deletion'
import settingsReducer, { settingsInitialState } from './settings'
import thingbotTelemetrixReducer, { thingbotTelemetrixInitialState } from './thingbot-telemetrix'
import toolboxReducer, { toolboxInitialState } from './toolbox'
import vmReducer, { vmInitialState } from './vm'
import vmStatusReducer, { vmStatusInitialState } from './vm-status'
import workspaceMetricsReducer, { workspaceMetricsInitialState } from './workspace-metrics'

/**
 * Builds the editor's initial state.
 * @returns The initial state, with a new VM.
 */
export const buildInitialState = () => ({
  alerts: alertsInitialState,
  board: boardInitialState,
  cameraAi: cameraAiInitialState,
  code: codeInitialState,
  connectionModal: connectionModalInitialState,
  customProcedures: customProceduresInitialState,
  editorTab: editorTabInitialState,
  modals: modalsInitialState,
  platform: platformInitialState,
  projectChanged: projectChangedInitialState,
  projectState: projectStateInitialState,
  projectTitle: projectTitleInitialState,
  restoreDeletion: restoreDeletionInitialState,
  settings: settingsInitialState,
  thingbotTelemetrix: thingbotTelemetrixInitialState,
  toolbox: toolboxInitialState,
  vm: vmInitialState(),
  vmStatus: vmStatusInitialState,
  workspaceMetrics: workspaceMetricsInitialState,
})

const guiReducer = combineReducers({
  alerts: alertsReducer,
  board: boardReducer,
  cameraAi: cameraAiReducer,
  code: codeReducer,
  connectionModal: connectionModalReducer,
  customProcedures: customProceduresReducer,
  editorTab: editorTabReducer,
  modals: modalReducer,
  platform: platformReducer,
  projectChanged: projectChangedReducer,
  projectState: projectStateReducer,
  projectTitle: projectTitleReducer,
  restoreDeletion: restoreDeletionReducer,
  settings: settingsReducer,
  thingbotTelemetrix: thingbotTelemetrixReducer,
  toolbox: toolboxReducer,
  vm: vmReducer,
  vmStatus: vmStatusReducer,
  workspaceMetrics: workspaceMetricsReducer,
})

export type GuiState = ReturnType<typeof guiReducer>

export default guiReducer
