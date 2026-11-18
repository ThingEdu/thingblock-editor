const DONE_CREATING_COPY = 'scratch-gui/project-state/DONE_CREATING_COPY'
const DONE_CREATING_NEW = 'scratch-gui/project-state/DONE_CREATING_NEW'
const DONE_FETCHING_DEFAULT = 'scratch-gui/project-state/DONE_FETCHING_DEFAULT'
const DONE_FETCHING_WITH_ID = 'scratch-gui/project-state/DONE_FETCHING_WITH_ID'
const DONE_LOADING_VM_TO_SAVE = 'scratch-gui/project-state/DONE_LOADING_VM_TO_SAVE'
const DONE_LOADING_VM_WITH_ID = 'scratch-gui/project-state/DONE_LOADING_VM_WITH_ID'
const DONE_LOADING_VM_WITHOUT_ID = 'scratch-gui/project-state/DONE_LOADING_VM_WITHOUT_ID'
const DONE_REMIXING = 'scratch-gui/project-state/DONE_REMIXING'
const DONE_UPDATING = 'scratch-gui/project-state/DONE_UPDATING'
const DONE_UPDATING_BEFORE_COPY = 'scratch-gui/project-state/DONE_UPDATING_BEFORE_COPY'
const DONE_UPDATING_BEFORE_NEW = 'scratch-gui/project-state/DONE_UPDATING_BEFORE_NEW'
const RETURN_TO_SHOWING = 'scratch-gui/project-state/RETURN_TO_SHOWING'
const SET_PROJECT_ID = 'scratch-gui/project-state/SET_PROJECT_ID'
const START_AUTO_UPDATING = 'scratch-gui/project-state/START_AUTO_UPDATING'
const START_CREATING_NEW = 'scratch-gui/project-state/START_CREATING_NEW'
const START_ERROR = 'scratch-gui/project-state/START_ERROR'
const START_FETCHING_NEW = 'scratch-gui/project-state/START_FETCHING_NEW'
const START_LOADING_VM_FILE_UPLOAD = 'scratch-gui/project-state/START_LOADING_VM_FILE_UPLOAD'
const START_MANUAL_UPDATING = 'scratch-gui/project-state/START_MANUAL_UPDATING'
const START_REMIXING = 'scratch-gui/project-state/START_REMIXING'
const START_UPDATING_BEFORE_CREATING_COPY = 'scratch-gui/project-state/START_UPDATING_BEFORE_CREATING_COPY'
const START_UPDATING_BEFORE_CREATING_NEW = 'scratch-gui/project-state/START_UPDATING_BEFORE_CREATING_NEW'

// Hardcoded id of the default project
export const defaultProjectId = '0'

export const LoadingState = {
  NOT_LOADED: 'NOT_LOADED',
  ERROR: 'ERROR',
  AUTO_UPDATING: 'AUTO_UPDATING',
  CREATING_COPY: 'CREATING_COPY',
  CREATING_NEW: 'CREATING_NEW',
  FETCHING_NEW_DEFAULT: 'FETCHING_NEW_DEFAULT',
  FETCHING_WITH_ID: 'FETCHING_WITH_ID',
  LOADING_VM_FILE_UPLOAD: 'LOADING_VM_FILE_UPLOAD',
  LOADING_VM_NEW_DEFAULT: 'LOADING_VM_NEW_DEFAULT',
  LOADING_VM_WITH_ID: 'LOADING_VM_WITH_ID',
  MANUAL_UPDATING: 'MANUAL_UPDATING',
  REMIXING: 'REMIXING',
  SHOWING_WITH_ID: 'SHOWING_WITH_ID',
  SHOWING_WITHOUT_ID: 'SHOWING_WITHOUT_ID',
  UPDATING_BEFORE_COPY: 'UPDATING_BEFORE_COPY',
  UPDATING_BEFORE_NEW: 'UPDATING_BEFORE_NEW',
} as const

export type LoadingStateName = (typeof LoadingState)[keyof typeof LoadingState]

export const LoadingStates = Object.keys(LoadingState) as LoadingStateName[]

export const getIsFetchingWithoutId = (loadingState: LoadingStateName) =>
  // LOADING_VM_FILE_UPLOAD is an honorary fetch, since there is no fetching step for file uploads
  loadingState === LoadingState.LOADING_VM_FILE_UPLOAD || loadingState === LoadingState.FETCHING_NEW_DEFAULT
export const getIsFetchingWithId = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.FETCHING_WITH_ID || loadingState === LoadingState.FETCHING_NEW_DEFAULT
export const getIsLoadingWithId = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.LOADING_VM_WITH_ID || loadingState === LoadingState.LOADING_VM_NEW_DEFAULT
export const getIsLoading = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.LOADING_VM_FILE_UPLOAD ||
  loadingState === LoadingState.LOADING_VM_WITH_ID ||
  loadingState === LoadingState.LOADING_VM_NEW_DEFAULT
export const getIsLoadingUpload = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.LOADING_VM_FILE_UPLOAD
export const getIsCreatingNew = (loadingState: LoadingStateName) => loadingState === LoadingState.CREATING_NEW
export const getIsAnyCreatingNewState = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.FETCHING_NEW_DEFAULT ||
  loadingState === LoadingState.LOADING_VM_NEW_DEFAULT ||
  loadingState === LoadingState.CREATING_NEW
export const getIsCreatingCopy = (loadingState: LoadingStateName) => loadingState === LoadingState.CREATING_COPY
export const getIsManualUpdating = (loadingState: LoadingStateName) => loadingState === LoadingState.MANUAL_UPDATING
export const getIsRemixing = (loadingState: LoadingStateName) => loadingState === LoadingState.REMIXING
export const getIsUpdating = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.AUTO_UPDATING ||
  loadingState === LoadingState.MANUAL_UPDATING ||
  loadingState === LoadingState.UPDATING_BEFORE_COPY ||
  loadingState === LoadingState.UPDATING_BEFORE_NEW
export const getIsShowingProject = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.SHOWING_WITH_ID || loadingState === LoadingState.SHOWING_WITHOUT_ID
export const getIsShowingWithId = (loadingState: LoadingStateName) => loadingState === LoadingState.SHOWING_WITH_ID
export const getIsShowingWithoutId = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.SHOWING_WITHOUT_ID
export const getIsError = (loadingState: LoadingStateName) => loadingState === LoadingState.ERROR

export type ProjectId = string | number

export interface ProjectState {
  error: unknown
  projectData: unknown
  projectId: ProjectId | null
  loadingState: LoadingStateName
}

export type ProjectStateAction =
  | { type: typeof DONE_CREATING_COPY | typeof DONE_CREATING_NEW | typeof DONE_REMIXING; projectId: ProjectId }
  | { type: typeof DONE_FETCHING_DEFAULT | typeof DONE_FETCHING_WITH_ID; projectData: unknown }
  | { type: typeof SET_PROJECT_ID; projectId: ProjectId | null }
  | { type: typeof START_ERROR; error?: unknown }
  | {
      type:
        | typeof DONE_LOADING_VM_TO_SAVE
        | typeof DONE_LOADING_VM_WITH_ID
        | typeof DONE_LOADING_VM_WITHOUT_ID
        | typeof DONE_UPDATING
        | typeof DONE_UPDATING_BEFORE_COPY
        | typeof DONE_UPDATING_BEFORE_NEW
        | typeof RETURN_TO_SHOWING
        | typeof START_AUTO_UPDATING
        | typeof START_CREATING_NEW
        | typeof START_FETCHING_NEW
        | typeof START_LOADING_VM_FILE_UPLOAD
        | typeof START_MANUAL_UPDATING
        | typeof START_REMIXING
        | typeof START_UPDATING_BEFORE_CREATING_COPY
        | typeof START_UPDATING_BEFORE_CREATING_NEW
    }

export const projectStateInitialState: ProjectState = {
  error: null,
  projectData: null,
  projectId: null,
  loadingState: LoadingState.NOT_LOADED,
}

const reducer = (state = projectStateInitialState, action: ProjectStateAction): ProjectState => {
  switch (action.type) {
    case DONE_CREATING_NEW:
      // We need to set project id since we just created new project on the server.
      // No need to load, we should have data already in vm.
      if (state.loadingState === LoadingState.CREATING_NEW) {
        return { ...state, loadingState: LoadingState.SHOWING_WITH_ID, projectId: action.projectId }
      }
      return state
    case DONE_FETCHING_WITH_ID:
      if (state.loadingState === LoadingState.FETCHING_WITH_ID) {
        return { ...state, loadingState: LoadingState.LOADING_VM_WITH_ID, projectData: action.projectData }
      }
      return state
    case DONE_FETCHING_DEFAULT:
      if (state.loadingState === LoadingState.FETCHING_NEW_DEFAULT) {
        return { ...state, loadingState: LoadingState.LOADING_VM_NEW_DEFAULT, projectData: action.projectData }
      }
      return state
    case DONE_LOADING_VM_WITHOUT_ID:
      if (
        state.loadingState === LoadingState.LOADING_VM_FILE_UPLOAD ||
        state.loadingState === LoadingState.LOADING_VM_NEW_DEFAULT
      ) {
        return { ...state, loadingState: LoadingState.SHOWING_WITHOUT_ID, projectId: defaultProjectId }
      }
      return state
    case DONE_LOADING_VM_WITH_ID:
      if (state.loadingState === LoadingState.LOADING_VM_WITH_ID) {
        return { ...state, loadingState: LoadingState.SHOWING_WITH_ID }
      }
      return state
    case DONE_LOADING_VM_TO_SAVE:
      if (state.loadingState === LoadingState.LOADING_VM_FILE_UPLOAD) {
        return { ...state, loadingState: LoadingState.AUTO_UPDATING }
      }
      return state
    case DONE_REMIXING:
      // We need to set project id since we just created new project on the server.
      // No need to load, we should have data already in vm.
      if (state.loadingState === LoadingState.REMIXING) {
        return { ...state, loadingState: LoadingState.SHOWING_WITH_ID, projectId: action.projectId }
      }
      return state
    case DONE_CREATING_COPY:
      // We need to set project id since we just created new project on the server.
      // No need to load, we should have data already in vm.
      if (state.loadingState === LoadingState.CREATING_COPY) {
        return { ...state, loadingState: LoadingState.SHOWING_WITH_ID, projectId: action.projectId }
      }
      return state
    case DONE_UPDATING:
      if (state.loadingState === LoadingState.AUTO_UPDATING || state.loadingState === LoadingState.MANUAL_UPDATING) {
        return { ...state, loadingState: LoadingState.SHOWING_WITH_ID }
      }
      return state
    case DONE_UPDATING_BEFORE_COPY:
      if (state.loadingState === LoadingState.UPDATING_BEFORE_COPY) {
        return { ...state, loadingState: LoadingState.CREATING_COPY }
      }
      return state
    case DONE_UPDATING_BEFORE_NEW:
      if (state.loadingState === LoadingState.UPDATING_BEFORE_NEW) {
        return { ...state, loadingState: LoadingState.FETCHING_NEW_DEFAULT, projectId: defaultProjectId }
      }
      return state
    case RETURN_TO_SHOWING:
      if (state.projectId === null || state.projectId === defaultProjectId) {
        return { ...state, loadingState: LoadingState.SHOWING_WITHOUT_ID, projectId: defaultProjectId }
      }
      return { ...state, loadingState: LoadingState.SHOWING_WITH_ID }
    case SET_PROJECT_ID:
      // if the projectId hasn't actually changed do nothing
      if (state.projectId === action.projectId) {
        return state
      }
      // if we were already showing a project, and a different projectId is set, only fetch that project if
      // projectId has changed. This prevents re-fetching projects unnecessarily.
      if (state.loadingState === LoadingState.SHOWING_WITH_ID) {
        // if setting the default project id, specifically fetch that project
        if (action.projectId === defaultProjectId || action.projectId === null) {
          return { ...state, loadingState: LoadingState.FETCHING_NEW_DEFAULT, projectId: defaultProjectId }
        }
        return { ...state, loadingState: LoadingState.FETCHING_WITH_ID, projectId: action.projectId }
      } else if (state.loadingState === LoadingState.SHOWING_WITHOUT_ID) {
        // if we were showing a project already, don't transition to default project.
        if (action.projectId !== defaultProjectId && action.projectId !== null) {
          return { ...state, loadingState: LoadingState.FETCHING_WITH_ID, projectId: action.projectId }
        }
      } else {
        // allow any other states to transition to fetching project
        // if setting the default project id, specifically fetch that project
        if (action.projectId === defaultProjectId || action.projectId === null) {
          return { ...state, loadingState: LoadingState.FETCHING_NEW_DEFAULT, projectId: defaultProjectId }
        }
        return { ...state, loadingState: LoadingState.FETCHING_WITH_ID, projectId: action.projectId }
      }
      return state
    case START_AUTO_UPDATING:
      if (state.loadingState === LoadingState.SHOWING_WITH_ID) {
        return { ...state, loadingState: LoadingState.AUTO_UPDATING }
      }
      return state
    case START_CREATING_NEW:
      if (state.loadingState === LoadingState.SHOWING_WITHOUT_ID) {
        return { ...state, loadingState: LoadingState.CREATING_NEW }
      }
      return state
    case START_FETCHING_NEW:
      if (
        ([LoadingState.SHOWING_WITH_ID, LoadingState.SHOWING_WITHOUT_ID] as LoadingStateName[]).includes(
          state.loadingState,
        )
      ) {
        return { ...state, loadingState: LoadingState.FETCHING_NEW_DEFAULT, projectId: defaultProjectId }
      }
      return state
    case START_LOADING_VM_FILE_UPLOAD:
      if (
        (
          [
            LoadingState.NOT_LOADED,
            LoadingState.SHOWING_WITH_ID,
            LoadingState.SHOWING_WITHOUT_ID,
          ] as LoadingStateName[]
        ).includes(state.loadingState)
      ) {
        return { ...state, loadingState: LoadingState.LOADING_VM_FILE_UPLOAD }
      }
      return state
    case START_MANUAL_UPDATING:
      if (state.loadingState === LoadingState.SHOWING_WITH_ID) {
        return { ...state, loadingState: LoadingState.MANUAL_UPDATING }
      }
      return state
    case START_REMIXING:
      if (state.loadingState === LoadingState.SHOWING_WITH_ID) {
        return { ...state, loadingState: LoadingState.REMIXING }
      }
      return state
    case START_UPDATING_BEFORE_CREATING_COPY:
      if (state.loadingState === LoadingState.SHOWING_WITH_ID) {
        return { ...state, loadingState: LoadingState.UPDATING_BEFORE_COPY }
      }
      return state
    case START_UPDATING_BEFORE_CREATING_NEW:
      if (state.loadingState === LoadingState.SHOWING_WITH_ID) {
        return { ...state, loadingState: LoadingState.UPDATING_BEFORE_NEW }
      }
      return state
    case START_ERROR:
      // fatal errors: there's no correct editor state for us to show
      if (
        (
          [
            LoadingState.FETCHING_NEW_DEFAULT,
            LoadingState.FETCHING_WITH_ID,
            LoadingState.LOADING_VM_NEW_DEFAULT,
            LoadingState.LOADING_VM_WITH_ID,
          ] as LoadingStateName[]
        ).includes(state.loadingState)
      ) {
        return { ...state, loadingState: LoadingState.ERROR, error: action.error }
      }
      // non-fatal errors: can keep showing editor state fine
      if (
        (
          [
            LoadingState.AUTO_UPDATING,
            LoadingState.CREATING_COPY,
            LoadingState.MANUAL_UPDATING,
            LoadingState.REMIXING,
            LoadingState.UPDATING_BEFORE_COPY,
            LoadingState.UPDATING_BEFORE_NEW,
          ] as LoadingStateName[]
        ).includes(state.loadingState)
      ) {
        return { ...state, loadingState: LoadingState.SHOWING_WITH_ID, error: action.error }
      }
      // non-fatal error; state to show depends on whether project we're showing
      // has an id or not
      if (state.loadingState === LoadingState.CREATING_NEW) {
        if (state.projectId === defaultProjectId || state.projectId === null) {
          return { ...state, loadingState: LoadingState.SHOWING_WITHOUT_ID, error: action.error }
        }
        return { ...state, loadingState: LoadingState.SHOWING_WITH_ID, error: action.error }
      }
      return state
    default:
      return state
  }
}

export const createProject = (): ProjectStateAction => ({
  type: START_CREATING_NEW,
})

export const doneCreatingProject = (
  id: ProjectId,
  loadingState: LoadingStateName,
): ProjectStateAction | undefined => {
  switch (loadingState) {
    case LoadingState.CREATING_NEW:
      return {
        type: DONE_CREATING_NEW,
        projectId: id,
      }
    case LoadingState.CREATING_COPY:
      return {
        type: DONE_CREATING_COPY,
        projectId: id,
      }
    case LoadingState.REMIXING:
      return {
        type: DONE_REMIXING,
        projectId: id,
      }
    default:
      return undefined
  }
}

export const onFetchedProjectData = (
  projectData: unknown,
  loadingState: LoadingStateName,
): ProjectStateAction | undefined => {
  switch (loadingState) {
    case LoadingState.FETCHING_WITH_ID:
      return {
        type: DONE_FETCHING_WITH_ID,
        projectData: projectData,
      }
    case LoadingState.FETCHING_NEW_DEFAULT:
      return {
        type: DONE_FETCHING_DEFAULT,
        projectData: projectData,
      }
    default:
      return undefined
  }
}

export const onLoadedProject = (
  loadingState: LoadingStateName,
  canSave: boolean,
  success: boolean,
): ProjectStateAction | undefined => {
  switch (loadingState) {
    case LoadingState.LOADING_VM_WITH_ID:
      if (success) {
        return { type: DONE_LOADING_VM_WITH_ID }
      }
      // failed to load project; just keep showing current project
      return { type: RETURN_TO_SHOWING }
    case LoadingState.LOADING_VM_FILE_UPLOAD:
      if (success) {
        if (canSave) {
          return { type: DONE_LOADING_VM_TO_SAVE }
        }
        return { type: DONE_LOADING_VM_WITHOUT_ID }
      }
      // failed to load project; just keep showing current project
      return { type: RETURN_TO_SHOWING }
    case LoadingState.LOADING_VM_NEW_DEFAULT:
      if (success) {
        return { type: DONE_LOADING_VM_WITHOUT_ID }
      }
      // failed to load default project; show error
      return { type: START_ERROR }
    default:
      return undefined
  }
}

export const doneUpdatingProject = (loadingState: LoadingStateName): ProjectStateAction | undefined => {
  switch (loadingState) {
    case LoadingState.AUTO_UPDATING:
    case LoadingState.MANUAL_UPDATING:
      return {
        type: DONE_UPDATING,
      }
    case LoadingState.UPDATING_BEFORE_COPY:
      return {
        type: DONE_UPDATING_BEFORE_COPY,
      }
    case LoadingState.UPDATING_BEFORE_NEW:
      return {
        type: DONE_UPDATING_BEFORE_NEW,
      }
    default:
      return undefined
  }
}

export const projectError = (error: unknown): ProjectStateAction => ({
  type: START_ERROR,
  error: error,
})

export const setProjectId = (id: ProjectId | null): ProjectStateAction => ({
  type: SET_PROJECT_ID,
  projectId: id,
})

export const requestNewProject = (needSave: boolean): ProjectStateAction => {
  if (needSave) return { type: START_UPDATING_BEFORE_CREATING_NEW }
  return { type: START_FETCHING_NEW }
}

export const requestProjectUpload = (loadingState: LoadingStateName): ProjectStateAction | undefined => {
  switch (loadingState) {
    case LoadingState.NOT_LOADED:
    case LoadingState.SHOWING_WITH_ID:
    case LoadingState.SHOWING_WITHOUT_ID:
      return {
        type: START_LOADING_VM_FILE_UPLOAD,
      }
    default:
      return undefined
  }
}

export const autoUpdateProject = (): ProjectStateAction => ({
  type: START_AUTO_UPDATING,
})

export const manualUpdateProject = (): ProjectStateAction => ({
  type: START_MANUAL_UPDATING,
})

export const saveProjectAsCopy = (): ProjectStateAction => ({
  type: START_UPDATING_BEFORE_CREATING_COPY,
})

export const remixProject = (): ProjectStateAction => ({
  type: START_REMIXING,
})

export default reducer
