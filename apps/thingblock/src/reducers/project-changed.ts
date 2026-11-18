const SET_PROJECT_CHANGED = 'scratch-gui/project-changed/SET_PROJECT_CHANGED'

interface ProjectChangedAction {
  type: typeof SET_PROJECT_CHANGED
  changed: boolean
}

export const projectChangedInitialState = false

const reducer = (state = projectChangedInitialState, action: ProjectChangedAction): boolean => {
  switch (action.type) {
    case SET_PROJECT_CHANGED:
      return action.changed
    default:
      return state
  }
}

export const setProjectChanged = (): ProjectChangedAction => ({ type: SET_PROJECT_CHANGED, changed: true })

export const setProjectUnchanged = (): ProjectChangedAction => ({ type: SET_PROJECT_CHANGED, changed: false })

export default reducer
