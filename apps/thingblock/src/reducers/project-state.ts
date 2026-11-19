const DONE_FETCHING_DEFAULT = 'scratch-gui/project-state/DONE_FETCHING_DEFAULT'
const DONE_LOADING_VM = 'scratch-gui/project-state/DONE_LOADING_VM'
const RETURN_TO_SHOWING = 'scratch-gui/project-state/RETURN_TO_SHOWING'
const START_ERROR = 'scratch-gui/project-state/START_ERROR'
const START_FETCHING_NEW = 'scratch-gui/project-state/START_FETCHING_NEW'
const START_LOADING_VM_FILE_UPLOAD = 'scratch-gui/project-state/START_LOADING_VM_FILE_UPLOAD'

export const LoadingState = {
  NOT_LOADED: 'NOT_LOADED',
  ERROR: 'ERROR',
  FETCHING_NEW_DEFAULT: 'FETCHING_NEW_DEFAULT',
  LOADING_VM_FILE_UPLOAD: 'LOADING_VM_FILE_UPLOAD',
  LOADING_VM_NEW_DEFAULT: 'LOADING_VM_NEW_DEFAULT',
  SHOWING: 'SHOWING',
} as const

export type LoadingStateName = (typeof LoadingState)[keyof typeof LoadingState]

export const LoadingStates = Object.keys(LoadingState) as LoadingStateName[]

export const getIsFetchingDefault = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.FETCHING_NEW_DEFAULT
export const getIsLoadingDefault = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.LOADING_VM_NEW_DEFAULT
export const getIsLoading = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.LOADING_VM_FILE_UPLOAD || loadingState === LoadingState.LOADING_VM_NEW_DEFAULT
export const getIsLoadingUpload = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.LOADING_VM_FILE_UPLOAD
export const getIsAnyCreatingNewState = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.FETCHING_NEW_DEFAULT || loadingState === LoadingState.LOADING_VM_NEW_DEFAULT
export const getIsShowingProject = (loadingState: LoadingStateName) => loadingState === LoadingState.SHOWING
export const getIsError = (loadingState: LoadingStateName) => loadingState === LoadingState.ERROR

export interface ProjectState {
  error: unknown
  /** The default project's JSON, once built. */
  projectData: object | null
  loadingState: LoadingStateName
}

export type ProjectStateAction =
  | { type: typeof DONE_FETCHING_DEFAULT; projectData: object }
  | { type: typeof START_ERROR; error?: unknown }
  | {
      type:
        | typeof DONE_LOADING_VM
        | typeof RETURN_TO_SHOWING
        | typeof START_FETCHING_NEW
        | typeof START_LOADING_VM_FILE_UPLOAD
    }

export const projectStateInitialState: ProjectState = {
  error: null,
  projectData: null,
  loadingState: LoadingState.NOT_LOADED,
}

// A new project can start loading only when none is being fetched or loaded
const getIsIdle = (loadingState: LoadingStateName) =>
  loadingState === LoadingState.NOT_LOADED || loadingState === LoadingState.SHOWING

const reducer = (state = projectStateInitialState, action: ProjectStateAction): ProjectState => {
  switch (action.type) {
    case DONE_FETCHING_DEFAULT:
      if (state.loadingState === LoadingState.FETCHING_NEW_DEFAULT) {
        return { ...state, loadingState: LoadingState.LOADING_VM_NEW_DEFAULT, projectData: action.projectData }
      }
      return state
    case DONE_LOADING_VM:
      if (getIsLoading(state.loadingState)) {
        return { ...state, loadingState: LoadingState.SHOWING }
      }
      return state
    case RETURN_TO_SHOWING:
      return { ...state, loadingState: LoadingState.SHOWING }
    case START_FETCHING_NEW:
      if (getIsIdle(state.loadingState)) {
        return { ...state, loadingState: LoadingState.FETCHING_NEW_DEFAULT }
      }
      return state
    case START_LOADING_VM_FILE_UPLOAD:
      if (getIsIdle(state.loadingState)) {
        return { ...state, loadingState: LoadingState.LOADING_VM_FILE_UPLOAD }
      }
      return state
    case START_ERROR:
      // Without the default project there is no editor state to show
      if (getIsAnyCreatingNewState(state.loadingState)) {
        return { ...state, loadingState: LoadingState.ERROR, error: action.error }
      }
      return state
    default:
      return state
  }
}

export const onFetchedProjectData = (projectData: object): ProjectStateAction => ({
  type: DONE_FETCHING_DEFAULT,
  projectData,
})

export const onLoadedProject = (
  loadingState: typeof LoadingState.LOADING_VM_FILE_UPLOAD | typeof LoadingState.LOADING_VM_NEW_DEFAULT,
  success: boolean,
): ProjectStateAction => {
  // A file that fails to load leaves the current project showing
  if (loadingState === LoadingState.LOADING_VM_FILE_UPLOAD)
    return { type: success ? DONE_LOADING_VM : RETURN_TO_SHOWING }
  return { type: success ? DONE_LOADING_VM : START_ERROR }
}

export const projectError = (error: unknown): ProjectStateAction => ({
  type: START_ERROR,
  error,
})

/**
 * Starts loading the default project, at startup and for File > New.
 * @returns The action.
 */
export const requestNewProject = (): ProjectStateAction => ({
  type: START_FETCHING_NEW,
})

export const requestProjectUpload = (): ProjectStateAction => ({
  type: START_LOADING_VM_FILE_UPLOAD,
})

export default reducer
