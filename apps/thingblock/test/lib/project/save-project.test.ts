import type { ReactElement } from 'react'
import type { UnknownAction } from 'redux'
import { afterEach, expect, test, vi } from 'vitest'
import { forgetCurrentFile } from '../../../src/lib/project/project-file'
import saveProject, { getProjectFilename } from '../../../src/lib/project/save-project'
import alertsReducer from '../../../src/reducers/alerts'

const blob = () => Promise.resolve(new Blob([new Uint8Array([7])]))

const desktop = (savePath: string | null) => {
  window.__TAURI_INTERNALS__ = {
    invoke: vi.fn((cmd: string) => Promise.resolve(cmd === 'pick_save_path' ? savePath : undefined)),
  }
}

afterEach(() => {
  delete window.__TAURI_INTERNALS__
  forgetCurrentFile()
  vi.useRealTimers()
})

test('offers the project title as the file name', () => {
  expect(getProjectFilename('Xe dò line')).toBe('Xe dò line.tb')
  expect(getProjectFilename('', 'Dự án ThingBlock')).toBe('Dự án ThingBlock.tb')
})

test('after saving, says where and names the project after the file', async () => {
  vi.useFakeTimers()
  desktop('/Users/em/Xe dò line.tb')
  const dispatch = vi.fn()
  const saved = await saveProject({ saveProjectSb3: blob, projectTitle: 'Dự án ThingBlock', dispatch })
  expect(saved?.path).toBe('/Users/em/Xe dò line.tb')
  const actions = dispatch.mock.calls.map(([action]) => action as UnknownAction)
  expect(actions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: 'Xe dò line' }),
      expect.objectContaining({ alertId: 'savedToFile', data: { path: '/Users/em/Xe dò line.tb' } }),
    ]),
  )

  // The alert renders the path it was shown with.
  const alert = actions.find((action) => action.alertId === 'savedToFile')
  const state = alertsReducer(undefined, alert as Parameters<typeof alertsReducer>[1])
  const shown = state.alertsList.find((a) => a.alertId === 'savedToFile')
  const content = shown?.content as ReactElement<{ id: string; values: unknown }>
  expect(content.props.values).toEqual({ path: '/Users/em/Xe dò line.tb' })
  expect(content.props.id).toBe('gui.alerts.savedToFile')
})

test('a cancelled dialog shows nothing', async () => {
  desktop(null)
  const dispatch = vi.fn()
  await expect(saveProject({ saveProjectSb3: blob, projectTitle: 'x', dispatch })).resolves.toBeNull()
  expect(dispatch).not.toHaveBeenCalled()
})

test('a failed save shows an error alert instead of throwing', async () => {
  vi.useFakeTimers()
  window.__TAURI_INTERNALS__ = {
    invoke: vi.fn((cmd: string) =>
      cmd === 'pick_save_path' ? Promise.resolve('/ro/x.tb') : Promise.reject(new Error('Permission denied')),
    ),
  }
  const dispatch = vi.fn()
  await expect(saveProject({ saveProjectSb3: blob, projectTitle: 'x', dispatch })).resolves.toBeNull()
  expect(dispatch).toHaveBeenCalledWith(
    expect.objectContaining({ alertId: 'saveToFileError', data: { message: 'Permission denied' } }),
  )
})
