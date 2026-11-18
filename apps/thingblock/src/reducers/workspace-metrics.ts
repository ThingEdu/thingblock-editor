const UPDATE_METRICS = 'scratch-gui/workspace-metrics/UPDATE_METRICS'

/** A workspace's scroll position and zoom. */
export interface WorkspaceMetrics {
  scrollX: number
  scrollY: number
  scale: number
}

export interface WorkspaceMetricsState {
  /** Metrics by target id. */
  targets: Record<string, WorkspaceMetrics>
}

type WorkspaceMetricsAction = { type: typeof UPDATE_METRICS; targetID: string } & WorkspaceMetrics

export const workspaceMetricsInitialState: WorkspaceMetricsState = {
  targets: {},
}

const reducer = (state = workspaceMetricsInitialState, action: WorkspaceMetricsAction): WorkspaceMetricsState => {
  switch (action.type) {
    case UPDATE_METRICS:
      return {
        ...state,
        targets: {
          ...state.targets,
          [action.targetID]: {
            scrollX: action.scrollX,
            scrollY: action.scrollY,
            scale: action.scale,
          },
        },
      }
    default:
      return state
  }
}

export const updateMetrics = (metrics: { targetID: string } & WorkspaceMetrics): WorkspaceMetricsAction => ({
  type: UPDATE_METRICS,
  ...metrics,
})

export default reducer
