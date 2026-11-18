const SET_PROJECT_TITLE = 'projectTitle/SET_PROJECT_TITLE'

interface ProjectTitleAction {
  type: typeof SET_PROJECT_TITLE
  title: string
}

// Blank rather than an actual title, because it would be hard to localize here
export const projectTitleInitialState = ''

const reducer = (state = projectTitleInitialState, action: ProjectTitleAction): string => {
  switch (action.type) {
    case SET_PROJECT_TITLE:
      return action.title
    default:
      return state
  }
}

export const setProjectTitle = (title: string): ProjectTitleAction => ({ type: SET_PROJECT_TITLE, title })

export default reducer
