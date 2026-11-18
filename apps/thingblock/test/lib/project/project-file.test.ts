import { afterEach, describe, expect, test, vi } from 'vitest'
import downloadBlob from '../../../src/lib/project/download-blob'
import {
  forgetCurrentFile,
  getCurrentFile,
  isDesktopApp,
  pickProjectFile,
  saveProjectFile,
  setCurrentFile,
  showFileInWindowTitle,
  trackProjectLoads,
} from '../../../src/lib/project/project-file'

vi.mock('../../../src/lib/project/download-blob', () => ({ default: vi.fn() }))

// A fake VM event bus.
const eventBus = () => {
  const listeners = new Map<string, Set<() => void>>()
  return {
    on: (event: string, listener: () => void) => {
      listeners.set(event, (listeners.get(event) ?? new Set()).add(listener))
    },
    removeListener: (event: string, listener: () => void) => {
      listeners.get(event)?.delete(listener)
    },
    emit: (event: string) => {
      listeners.get(event)?.forEach((listener) => {
        listener()
      })
    },
  }
}

const project = () => new Blob([new Uint8Array([1, 2, 3])])

// A fake Tauri IPC whose Save/Open dialogs answer from a queue.
const installTauri = ({
  savePaths = [],
  openPaths = [],
  files = {},
}: { savePaths?: (string | null)[]; openPaths?: (string | null)[]; files?: Record<string, ArrayBuffer> } = {}) => {
  const written: Record<string, number[]> = {}
  const calls: string[] = []
  const invoke = vi.fn<TauriInternals['invoke']>((cmd, args, options) => {
    calls.push(cmd)
    switch (cmd) {
      case 'pick_save_path':
        return Promise.resolve(savePaths.shift() ?? null)
      case 'pick_open_path':
        return Promise.resolve(openPaths.shift() ?? null)
      case 'write_project_file':
        written[decodeURIComponent(options?.headers['x-project-path'] ?? '')] = Array.from(args as Uint8Array)
        return Promise.resolve()
      case 'read_project_file':
        return Promise.resolve(files[(args as { path: string }).path])
      case 'set_window_title':
        return Promise.resolve()
      default:
        return Promise.reject(new Error(`unexpected ${cmd}`))
    }
  })
  window.__TAURI_INTERNALS__ = { invoke }
  return { written, calls, invoke }
}

afterEach(() => {
  delete window.__TAURI_INTERNALS__
  delete window.showSaveFilePicker
  forgetCurrentFile()
  vi.mocked(downloadBlob).mockClear()
})

describe('desktop app', () => {
  test('first save asks where, then Ctrl+S writes back to the same file without asking', async () => {
    const { written, calls, invoke } = installTauri({ savePaths: ['/Users/em/Tài liệu/Xe dò line.tb'] })
    expect(isDesktopApp()).toBe(true)

    const first = await saveProjectFile(project(), { suggestedName: 'Dự án ThingBlock.tb' })
    expect(first).toEqual({ path: '/Users/em/Tài liệu/Xe dò line.tb', name: 'Xe dò line.tb' })
    expect(written['/Users/em/Tài liệu/Xe dò line.tb']).toEqual([1, 2, 3])
    expect(invoke).toHaveBeenCalledWith('pick_save_path', { suggestedName: 'Dự án ThingBlock.tb' })

    calls.length = 0
    const second = await saveProjectFile(project(), { suggestedName: 'Dự án ThingBlock.tb' })
    expect(second?.path).toBe('/Users/em/Tài liệu/Xe dò line.tb')
    expect(calls).toEqual(['write_project_file'])
  })

  test('"Save as" always asks, and the new file becomes current', async () => {
    installTauri({ savePaths: ['/a/one.tb', '/a/two.tb'] })
    await saveProjectFile(project(), { suggestedName: 'x.tb' })
    const saved = await saveProjectFile(project(), { suggestedName: 'x.tb', saveAs: true })
    expect(saved?.path).toBe('/a/two.tb')
    expect(getCurrentFile()?.path).toBe('/a/two.tb')
  })

  test('cancelling the dialog saves nothing and is not an error', async () => {
    const { written } = installTauri({ savePaths: [null] })
    await expect(saveProjectFile(project(), { suggestedName: 'x.tb' })).resolves.toBeNull()
    expect(written).toEqual({})
    expect(getCurrentFile()).toBeNull()
  })

  test('a write failure rejects and keeps no current file', async () => {
    const { invoke } = installTauri()
    invoke.mockImplementation((cmd: string) =>
      cmd === 'pick_save_path' ? Promise.resolve('/ro/x.tb') : Promise.reject(new Error('Permission denied')),
    )
    await expect(saveProjectFile(project(), { suggestedName: 'x.tb' })).rejects.toThrow('Permission denied')
    expect(getCurrentFile()).toBeNull()
  })

  test('opening a file through the Open dialog makes Ctrl+S overwrite it', async () => {
    const data = new ArrayBuffer(4)
    const { calls } = installTauri({ openPaths: ['C:\\Hoc\\robot.tb'], files: { 'C:\\Hoc\\robot.tb': data } })
    const file = await pickProjectFile()
    expect(file).toEqual({ path: 'C:\\Hoc\\robot.tb', name: 'robot.tb', data })
    if (!file) throw new Error('no file picked')
    setCurrentFile(file)

    calls.length = 0
    const saved = await saveProjectFile(project(), { suggestedName: 'robot.tb' })
    expect(saved?.path).toBe('C:\\Hoc\\robot.tb')
    expect(calls).toEqual(['write_project_file'])
  })

  test('a cancelled Open dialog reads nothing', async () => {
    const { calls } = installTauri({ openPaths: [null] })
    await expect(pickProjectFile()).resolves.toBeNull()
    expect(calls).toEqual(['pick_open_path'])
  })

  test('loading another project forgets the file, so Ctrl+S asks again', async () => {
    const events = eventBus()
    const stop = trackProjectLoads(events)
    installTauri({ savePaths: ['/a/one.tb', '/a/two.tb'] })
    await saveProjectFile(project(), { suggestedName: 'x.tb' })
    events.emit('PROJECT_LOADED') // e.g. an example opened
    expect(getCurrentFile()).toBeNull()
    const saved = await saveProjectFile(project(), { suggestedName: 'x.tb' })
    expect(saved?.path).toBe('/a/two.tb')
    stop()
    events.emit('PROJECT_LOADED')
    expect(getCurrentFile()?.path).toBe('/a/two.tb')
  })

  test('the window title names the file', () => {
    const { invoke } = installTauri()
    showFileInWindowTitle('Xe dò line.tb')
    expect(invoke).toHaveBeenCalledWith('set_window_title', { title: 'Xe dò line.tb — ThingBlock' })
    expect(document.title).toBe('Xe dò line.tb — ThingBlock')
    showFileInWindowTitle(null)
    expect(document.title).toBe('ThingBlock')
  })
})

describe('browser', () => {
  test('uses the save file picker when there is one, and reuses the handle on the next save', async () => {
    const write = vi.fn()
    const handle = { name: 'bai.tb', createWritable: vi.fn(() => Promise.resolve({ write, close: vi.fn() })) }
    const picker = vi.fn(() => Promise.resolve(handle as unknown as FileSystemFileHandle))
    window.showSaveFilePicker = picker
    expect(isDesktopApp()).toBe(false)

    await expect(saveProjectFile(project(), { suggestedName: 'x.tb' })).resolves.toEqual({
      path: null,
      name: 'bai.tb',
    })
    await saveProjectFile(project(), { suggestedName: 'x.tb' })
    expect(picker).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledTimes(2)
    expect(downloadBlob).not.toHaveBeenCalled()
  })

  test('a cancelled save file picker is not an error', async () => {
    window.showSaveFilePicker = () => {
      const error = new Error('The user aborted a request.')
      error.name = 'AbortError'
      return Promise.reject(error)
    }
    await expect(saveProjectFile(project(), { suggestedName: 'x.tb' })).resolves.toBeNull()
  })

  test('without a picker the project is downloaded', async () => {
    const content = project()
    await expect(saveProjectFile(content, { suggestedName: 'Dự án ThingBlock.tb' })).resolves.toEqual({
      path: null,
      name: 'Dự án ThingBlock.tb',
      downloaded: true,
    })
    expect(downloadBlob).toHaveBeenCalledWith('Dự án ThingBlock.tb', content)
  })
})
