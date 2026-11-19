const DONE_FETCHING_DEFAULT = 'scratch-gui/project-state/DONE_FETCHING_DEFAULT'
const DONE_FETCHING_WITH_ID = 'scratch-gui/project-state/DONE_FETCHING_WITH_ID'
const DONE_LOADING_VM_WITH_ID = 'scratch-gui/project-state/DONE_LOADING_VM_WITH_ID'
const DONE_LOADING_VM_WITHOUT_ID = 'scratch-gui/project-state/DONE_LOADING_VM_WITHOUT_ID'
const RETURN_TO_SHOWING = 'scratch-gui/project-state/RETURN_TO_SHOWING'
const SET_PROJECT_ID = 'scratch-gui/project-state/SET_PROJECT_ID'
const START_ERROR = 'scratch-gui/project-state/START_ERROR'
const START_FETCHING_NEW = 'scratch-gui/project-state/START_FETCHING_NEW'
const START_LOADING_VM_FILE_UPLOAD = 'scratch-gui/project-state/START_LOADING_VM_FILE_UPLOAD'

// Hardcoded id of the default project
export const defaultProjectId = '0'

export const LoadingState = {
  NOT_LOADED: 'NOT_LOADED',
  ERROR: 'ERROR',
  FETCHING_NEW_DEFAULT: 'FETCHING_NEW_DEFAULT',
  FETCHING_WITH_ID: 'FETCHING_WITH_ID',
  LOADING_VM_FILE_UPLOAD: 'LOADING_VM_FILE_UPLOAD',
  LOADING_VM_NEW_DEFAULT: 'LOADING_VM_NEW_DEFAULT',
  LOADING_VM_WITH_ID: 'LOADING_VM_WITH_ID',
  SHOWING_WITH_ID: 'SHOWING_WITH_ID',
  SHOWING_WITHOUT_ID: 'SHOWING_WITHOUT_ID',
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
export const getIsAnyCreatingNewState = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.FETCHING_NEW_DEFAULT || loadingState === LoadingState.LOADING_VM_NEW_DEFAULT
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
  | { type: typeof DONE_FETCHING_DEFAULT | typeof DONE_FETCHING_WITH_ID; projectData: unknown }
  | { type: typeof SET_PROJECT_ID; projectId: ProjectId | null }
  | { type: typeof START_ERROR; error?: unknown }
  | {
      type:
        | typeof DONE_LOADING_VM_WITH_ID
        | typeof DONE_LOADING_VM_WITHOUT_ID
        | typeof RETURN_TO_SHOWING
        | typeof START_FETCHING_NEW
        | typeof START_LOADING_VM_FILE_UPLOAD
    }

export const projectStateInitialState: ProjectState = {
  error: null,
  projectData: null,
  projectId: null,
  loadingState: LoadingState.NOT_LOADED,
}

const reducer = (state = projectStateInitialState, action: ProjectStateAction): ProjectState => {
  switch (action.type) {
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
      return state
    default:
      return state
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

export const onLoadedProject = (loadingState: LoadingStateName, success: boolean): ProjectStateAction | undefined => {
  switch (loadingState) {
    case LoadingState.LOADING_VM_WITH_ID:
      if (success) {
        return { type: DONE_LOADING_VM_WITH_ID }
      }
      // failed to load project; just keep showing current project
      return { type: RETURN_TO_SHOWING }
    case LoadingState.LOADING_VM_FILE_UPLOAD:
      if (success) {
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

export const projectError = (error: unknown): ProjectStateAction => ({
  type: START_ERROR,
  error: error,
})

export const setProjectId = (id: ProjectId | null): ProjectStateAction => ({
  type: SET_PROJECT_ID,
  projectId: id,
})

export const requestNewProject = (): ProjectStateAction => ({
  type: START_FETCHING_NEW,
})

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

export default reducer
