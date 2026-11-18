import { expect, test } from 'vitest'
import workspaceMetricsReducer, { updateMetrics } from '../../src/reducers/workspace-metrics'

const unrelatedAction = { type: 'anything' } as unknown as ReturnType<typeof updateMetrics>

test('initialState', () => {
  /* workspaceMetricsReducer(state, action) */
  expect(workspaceMetricsReducer(undefined, unrelatedAction)).toBeDefined()
  expect(workspaceMetricsReducer(undefined, unrelatedAction)).toEqual({ targets: {} })
})

test('updateMetrics action creator', () => {
  const action = updateMetrics({
    targetID: 'abcde',
    scrollX: 225,
    scrollY: 315,
    scale: 1.25,
  })
  const resultState = workspaceMetricsReducer(undefined, action)
  expect(Object.keys(resultState.targets).length).toBe(1)
  expect(resultState.targets.abcde).toBeDefined()
  expect(resultState.targets.abcde.scrollX).toBe(225)
  expect(resultState.targets.abcde.scrollY).toBe(315)
  expect(resultState.targets.abcde.scale).toBe(1.25)
})
