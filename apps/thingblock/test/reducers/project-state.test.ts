import { expect, test } from 'vitest'
import projectStateReducer, {
  type ProjectState,
  type ProjectStateAction,
  projectStateInitialState,
  LoadingState,
  onFetchedProjectData,
  onLoadedProject,
  projectError,
  requestNewProject,
  requestProjectUpload,
  setProjectId,
} from '../../src/reducers/project-state'

const unrelatedAction = { type: 'anything' } as unknown as ProjectStateAction

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
  /* projectStateReducer(state, action) */
  expect(projectStateReducer(undefined, unrelatedAction)).toBeDefined()
  expect(projectStateReducer(undefined, unrelatedAction).error).toBe(null)
  expect(projectStateReducer(undefined, unrelatedAction).projectData).toBe(null)
  expect(projectStateReducer(undefined, unrelatedAction).projectId).toBe(null)
  expect(projectStateReducer(undefined, unrelatedAction).loadingState).toBe(LoadingState.NOT_LOADED)
})

test('onFetchedProjectData with id loads project data into vm', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectData: null,
    loadingState: LoadingState.FETCHING_WITH_ID,
  }
  const action = onFetchedProjectData('1010101', initialState.loadingState)
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.LOADING_VM_WITH_ID)
  expect(resultState.projectData).toBe('1010101')
})

test('onFetchedProjectData new loads project data into vm', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectData: null,
    loadingState: LoadingState.FETCHING_NEW_DEFAULT,
  }
  const action = onFetchedProjectData('1010101', initialState.loadingState)
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.LOADING_VM_NEW_DEFAULT)
  expect(resultState.projectData).toBe('1010101')
})

// onLoadedProject: LOADING_VM_WITH_ID

test('onLoadedProject(LOADING_VM_WITH_ID, true) results in state SHOWING_WITH_ID', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectId: '100',
    loadingState: LoadingState.LOADING_VM_WITH_ID,
  }
  const action = onLoadedProject(initialState.loadingState, true)
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.SHOWING_WITH_ID)
  expect(resultState.projectId).toBe('100')
})

// case where we started out viewing a project with a projectId, then
// started to load another project; but loading fails. We go back to
// showing the original project.
test('onLoadedProject(LOADING_VM_WITH_ID, false), with project id, ' + 'results in state SHOWING_WITH_ID', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectId: '100',
    loadingState: LoadingState.LOADING_VM_WITH_ID,
  }
  const action = onLoadedProject(initialState.loadingState, false)
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.SHOWING_WITH_ID)
  expect(resultState.projectId).toBe('100')
})

// case where we started out viewing a project with default projectId, then
// started to load one with an id, such as in standalone mode when user adds
// '#PROJECT_ID_NUMBER' to the URI; but loading fails. We go back to
// showing the original project.
test(
  'onLoadedProject(LOADING_VM_WITH_ID, false), with no project id, ' + 'results in state SHOWING_WITHOUT_ID',
  () => {
    const initialState: ProjectState = {
      ...projectStateInitialState,
      projectId: '0',
      loadingState: LoadingState.LOADING_VM_WITH_ID,
    }
    const action = onLoadedProject(initialState.loadingState, false)
    const resultState = reduce(initialState, action)
    expect(resultState.loadingState).toBe(LoadingState.SHOWING_WITHOUT_ID)
    expect(resultState.projectId).toBe('0')
  },
)

// onLoadedProject: LOADING_VM_FILE_UPLOAD

test('onLoadedProject(LOADING_VM_FILE_UPLOAD, true) results in state SHOWING_WITHOUT_ID', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectId: '0',
    loadingState: LoadingState.LOADING_VM_FILE_UPLOAD,
  }
  const action = onLoadedProject(initialState.loadingState, true)
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.SHOWING_WITHOUT_ID)
  expect(resultState.projectId).toBe('0')
})

test(
  'onLoadedProject(LOADING_VM_FILE_UPLOAD, false), when we know project id, ' + 'results in state SHOWING_WITH_ID',
  () => {
    const initialState: ProjectState = {
      ...projectStateInitialState,
      projectId: '100',
      loadingState: LoadingState.LOADING_VM_FILE_UPLOAD,
    }
    const action = onLoadedProject(initialState.loadingState, false)
    const resultState = reduce(initialState, action)
    expect(resultState.loadingState).toBe(LoadingState.SHOWING_WITH_ID)
    expect(resultState.projectId).toBe('100')
  },
)

test(
  'onLoadedProject(LOADING_VM_FILE_UPLOAD, false), when we ' +
    "don't know project id, results in state SHOWING_WITHOUT_ID",
  () => {
    const initialState: ProjectState = {
      ...projectStateInitialState,
      projectId: '0',
      loadingState: LoadingState.LOADING_VM_FILE_UPLOAD,
    }
    const action = onLoadedProject(initialState.loadingState, false)
    const resultState = reduce(initialState, action)
    expect(resultState.loadingState).toBe(LoadingState.SHOWING_WITHOUT_ID)
    expect(resultState.projectId).toBe('0')
  },
)

// onLoadedProject: LOADING_VM_NEW_DEFAULT

test('onLoadedProject(LOADING_VM_NEW_DEFAULT, true) results in state SHOWING_WITHOUT_ID', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectId: '0',
    loadingState: LoadingState.LOADING_VM_NEW_DEFAULT,
  }
  const action = onLoadedProject(initialState.loadingState, true)
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.SHOWING_WITHOUT_ID)
  expect(resultState.projectId).toBe('0')
})

test('onLoadedProject(LOADING_VM_NEW_DEFAULT, false) results in ERROR state', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectId: '0',
    loadingState: LoadingState.LOADING_VM_NEW_DEFAULT,
  }
  const action = onLoadedProject(initialState.loadingState, false)
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.ERROR)
  expect(resultState.projectId).toBe('0')
})

test('calling setProjectId, using with same id as already showing, ' + 'results in state SHOWING_WITH_ID', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectId: '100',
    loadingState: LoadingState.SHOWING_WITH_ID,
  }
  const action = setProjectId('100')
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.SHOWING_WITH_ID)
  expect(resultState.projectId).toBe('100')
})

test(
  'calling setProjectId, using different id from project already showing, ' + 'results in state FETCHING_WITH_ID',
  () => {
    const initialState: ProjectState = {
      ...projectStateInitialState,
      projectId: 99,
      loadingState: LoadingState.SHOWING_WITH_ID,
    }
    const action = setProjectId('100')
    const resultState = reduce(initialState, action)
    expect(resultState.loadingState).toBe(LoadingState.FETCHING_WITH_ID)
    expect(resultState.projectId).toBe('100')
  },
)

test(
  'setProjectId, with same id as before, but not same type, ' +
    'results in FETCHING_WITH_ID because the two projectIds are not strictly equal',
  () => {
    const initialState: ProjectState = {
      ...projectStateInitialState,
      projectId: '100',
      loadingState: LoadingState.SHOWING_WITH_ID,
    }
    const action = setProjectId(100)
    const resultState = reduce(initialState, action)
    expect(resultState.loadingState).toBe(LoadingState.FETCHING_WITH_ID)
    expect(resultState.projectId).toBe(100)
  },
)

test('requestNewProject results in FETCHING_NEW_DEFAULT', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectId: '0',
    loadingState: LoadingState.SHOWING_WITHOUT_ID,
  }
  const action = requestNewProject()
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.FETCHING_NEW_DEFAULT)
  expect(resultState.projectId).toBe('0')
})

test('requestProjectUpload when project not loaded results in state LOADING_VM_FILE_UPLOAD', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectId: null,
    loadingState: LoadingState.NOT_LOADED,
  }
  const action = requestProjectUpload(initialState.loadingState)
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.LOADING_VM_FILE_UPLOAD)
  expect(resultState.projectId).toBe(null)
})

test('requestProjectUpload when showing project with id results in state LOADING_VM_FILE_UPLOAD', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectId: '100',
    loadingState: LoadingState.SHOWING_WITH_ID,
  }
  const action = requestProjectUpload(initialState.loadingState)
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.LOADING_VM_FILE_UPLOAD)
  expect(resultState.projectId).toBe('100')
})

test('requestProjectUpload when showing project without id results in state LOADING_VM_FILE_UPLOAD', () => {
  const initialState: ProjectState = {
    ...projectStateInitialState,
    projectId: null,
    loadingState: LoadingState.SHOWING_WITHOUT_ID,
  }
  const action = requestProjectUpload(initialState.loadingState)
  const resultState = reduce(initialState, action)
  expect(resultState.loadingState).toBe(LoadingState.LOADING_VM_FILE_UPLOAD)
  expect(resultState.projectId).toBe(null)
})

test('fatal projectError should show error state', () => {
  const startStates = [
    LoadingState.FETCHING_NEW_DEFAULT,
    LoadingState.FETCHING_WITH_ID,
    LoadingState.LOADING_VM_NEW_DEFAULT,
    LoadingState.LOADING_VM_WITH_ID,
  ]
  for (const startState of startStates) {
    const initialState: ProjectState = {
      ...projectStateInitialState,
      error: null,
      projectId: '100',
      loadingState: startState,
    }
    const action = projectError('Error string')
    const resultState = reduce(initialState, action)
    expect(resultState.loadingState).toBe(LoadingState.ERROR)
    expect(resultState.error).toEqual('Error string')
    expect(resultState.projectId).toBe('100')
  }
})
