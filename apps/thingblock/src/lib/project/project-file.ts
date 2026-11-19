/**
 * Where the open project lives on disk, and how to save it there.
 *
 * In the desktop app (Tauri) "Lưu" opens the native Save dialog the first time, then writes back to
 * the same file; "Lưu thành…" always asks. Opening a project through the native Open dialog makes
 * that file the current one, so Ctrl+S overwrites it. Loading anything else (New, a browser file
 * input) forgets the current file, so a save never lands on the wrong project.
 *
 * In a browser, the File System Access API (`showSaveFilePicker`) gives the same behaviour where it
 * exists; elsewhere a save falls back to a download.
 */
import downloadBlob from './download-blob'

const PROJECT_LOADED = 'PROJECT_LOADED'

/** A file the project was saved to or opened from. */
export interface ProjectFile {
  path: string | null
  name: string
}

/** Where a save went; `downloaded` when it fell back to a download. */
export interface SavedProjectFile extends ProjectFile {
  downloaded?: boolean
}

/** The part of the VM event bus that reports project loads. */
interface ProjectLoadEvents {
  on(event: string, listener: () => void): unknown
  removeListener(event: string, listener: () => void): unknown
}

let current: (ProjectFile & { handle: FileSystemFileHandle | null }) | null = null
let trackedEvents: ProjectLoadEvents | null = null

const tauri = () => window.__TAURI_INTERNALS__ ?? null

/**
 * @returns Whether the editor runs inside the desktop app.
 */
export const isDesktopApp = () => !!tauri()

const basename = (path: string) => path.split(/[\\/]/).pop() ?? path

/**
 * @returns The file the open project was saved to or opened from.
 */
export const getCurrentFile = (): ProjectFile | null => (current ? { path: current.path, name: current.name } : null)

export const forgetCurrentFile = () => {
  current = null
}

const remember = (file: ProjectFile, handle: FileSystemFileHandle | null) => {
  current = { ...file, handle }
}

const onProjectLoaded = forgetCurrentFile

/**
 * Follows project loads on the VM event bus: every load forgets the current file. The VM reports the
 * load before `vm.project.load()` resolves, so a file opened from the Open dialog is made current
 * afterwards with `setCurrentFile`.
 * @param events The VM event bus.
 * @returns A function that stops tracking.
 */
export const trackProjectLoads = (events: ProjectLoadEvents) => {
  if (trackedEvents) trackedEvents.removeListener(PROJECT_LOADED, onProjectLoaded)
  trackedEvents = events
  events.on(PROJECT_LOADED, onProjectLoaded)
  return () => {
    events.removeListener(PROJECT_LOADED, onProjectLoaded)
    if (trackedEvents === events) trackedEvents = null
  }
}

const isAbort = (error: unknown) => error instanceof Error && error.name === 'AbortError'

/**
 * Saves the project.
 * @param content The `.tb` bytes.
 * @param options How to save it.
 * @param options.suggestedName The file name to offer, e.g. "Dự án ThingBlock.tb".
 * @param options.saveAs Always ask where to save, even when there is a current file.
 * @returns Where it was saved, or null when the user cancelled the dialog.
 */
export const saveProjectFile = async (
  content: Blob,
  options: { suggestedName: string; saveAs?: boolean },
): Promise<SavedProjectFile | null> => {
  const { suggestedName, saveAs = false } = options
  const ipc = tauri()
  if (ipc) {
    let path = !saveAs && current ? current.path : null
    if (!path) {
      path = (await ipc.invoke('pick_save_path', { suggestedName })) as string | null
      if (!path) return null
    }
    const bytes = new Uint8Array(await content.arrayBuffer())
    await ipc.invoke('write_project_file', bytes, {
      headers: { 'x-project-path': encodeURIComponent(path) },
    })
    remember({ path, name: basename(path) }, null)
    return getCurrentFile()
  }
  if (window.showSaveFilePicker) {
    let handle = !saveAs && current ? current.handle : null
    if (!handle) {
      try {
        handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: 'ThingBlock', accept: { 'application/x.thingblock': ['.tb'] } }],
        })
      } catch (error) {
        if (isAbort(error)) return null
        throw error
      }
    }
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
    remember({ path: null, name: handle.name }, handle)
    return getCurrentFile()
  }
  downloadBlob(suggestedName, content)
  return { path: null, name: suggestedName, downloaded: true }
}

/**
 * Desktop only: asks for a `.tb` file with the native Open dialog and reads it. Once its bytes have
 * loaded, call `setCurrentFile(file)` so Ctrl+S writes back to it.
 * @returns The file and its bytes, or null when cancelled.
 */
export const pickProjectFile = async (): Promise<{ path: string; name: string; data: ArrayBuffer } | null> => {
  const ipc = tauri()
  if (!ipc) throw new Error('pickProjectFile: only available in the desktop app')
  const path = (await ipc.invoke('pick_open_path')) as string | null
  if (!path) return null
  const data = (await ipc.invoke('read_project_file', { path })) as ArrayBuffer
  return { path, name: basename(path), data }
}

/**
 * Makes a file the one the open project lives in.
 * @param file A file picked in the Open dialog and just loaded.
 */
export const setCurrentFile = (file: ProjectFile) => {
  remember(file, null)
}

/**
 * Shows the file name in the window title.
 * @param name The project's file name, or null for an unsaved project.
 */
export const showFileInWindowTitle = (name: string | null) => {
  const title = name ? `${name} — ThingBlock` : 'ThingBlock'
  document.title = title
  tauri()
    ?.invoke('set_window_title', { title })
    .catch(() => {})
}
