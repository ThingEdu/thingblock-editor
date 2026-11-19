import { expect, test } from 'vitest'
import projectStateReducer, {
  type LoadingStateName,
  type ProjectState,
  type ProjectStateAction,
  LoadingState,
  onFetchedProjectData,
  onLoadedProject,
  projectError,
  projectStateInitialState,
  requestNewProject,
  requestProjectUpload,
} from '../../src/reducers/project-state'

const inState = (loadingState: LoadingStateName): ProjectState => ({ ...projectStateInitialState, loadingState })

/**
 * Applies an action creator's result to a state.
 * @param state - The state before the action.
 * @param action - The creator's result, which is undefined when it has no action for the state.
 * @returns The state after the action.
 */
const reduce = (state: ProjectState, action: ProjectStateAction | undefined) => {
  if (!action) throw new Error('reduce: the action creator returned no action for this state')
  return projectStateReducer(state, action)
}

test('initialState', () => {
  const unrelatedAction = { type: 'anything' } as unknown as ProjectStateAction
  expect(projectStateReducer(undefined, unrelatedAction)).toEqual({
    error: null,
    projectData: null,
    loadingState: LoadingState.NOT_LOADED,
  })
})

test('requestNewProject fetches the default project at startup and while showing a project', () => {
  for (const loadingState of [LoadingState.NOT_LOADED, LoadingState.SHOWING]) {
    expect(reduce(inState(loadingState), requestNewProject()).loadingState).toBe(LoadingState.FETCHING_NEW_DEFAULT)
  }
})

test('requestNewProject does nothing while a project is loading', () => {
  const state = inState(LoadingState.LOADING_VM_FILE_UPLOAD)
  expect(reduce(state, requestNewProject())).toBe(state)
})

test('onFetchedProjectData loads the fetched default project into the VM', () => {
  const projectData = { targets: [] }
  const resultState = reduce(inState(LoadingState.FETCHING_NEW_DEFAULT), onFetchedProjectData(projectData))
  expect(resultState.loadingState).toBe(LoadingState.LOADING_VM_NEW_DEFAULT)
  expect(resultState.projectData).toBe(projectData)
})

test('onLoadedProject shows the default project, or the error state when it fails to load', () => {
  const state = inState(LoadingState.LOADING_VM_NEW_DEFAULT)
  expect(reduce(state, onLoadedProject(LoadingState.LOADING_VM_NEW_DEFAULT, true)).loadingState).toBe(
    LoadingState.SHOWING,
  )
  expect(reduce(state, onLoadedProject(LoadingState.LOADING_VM_NEW_DEFAULT, false)).loadingState).toBe(
    LoadingState.ERROR,
  )
})

test('onLoadedProject shows the project after a file upload, whether or not the file loaded', () => {
  const state = inState(LoadingState.LOADING_VM_FILE_UPLOAD)
  expect(reduce(state, onLoadedProject(LoadingState.LOADING_VM_FILE_UPLOAD, true)).loadingState).toBe(
    LoadingState.SHOWING,
  )
  expect(reduce(state, onLoadedProject(LoadingState.LOADING_VM_FILE_UPLOAD, false)).loadingState).toBe(
    LoadingState.SHOWING,
  )
})

test('requestProjectUpload loads a file before any project and while showing one, but not while fetching', () => {
  for (const loadingState of [LoadingState.NOT_LOADED, LoadingState.SHOWING]) {
    expect(reduce(inState(loadingState), requestProjectUpload()).loadingState).toBe(
      LoadingState.LOADING_VM_FILE_UPLOAD,
    )
  }
  const fetching = inState(LoadingState.FETCHING_NEW_DEFAULT)
  expect(reduce(fetching, requestProjectUpload())).toBe(fetching)
})

test('projectError while fetching or loading the default project shows the error state', () => {
  for (const loadingState of [LoadingState.FETCHING_NEW_DEFAULT, LoadingState.LOADING_VM_NEW_DEFAULT]) {
    const resultState = reduce(inState(loadingState), projectError('Error string'))
    expect(resultState.loadingState).toBe(LoadingState.ERROR)
    expect(resultState.error).toBe('Error string')
  }
})

test('projectError while showing a project changes nothing', () => {
  const state = inState(LoadingState.SHOWING)
  expect(reduce(state, projectError('Error string'))).toBe(state)
})
