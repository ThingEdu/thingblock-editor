/** The IPC bridge the Tauri desktop shell puts on the page. */
interface TauriInternals {
  invoke(cmd: string, args?: unknown, options?: { headers: Record<string, string> }): Promise<unknown>
}

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: { description?: string; accept: Record<string, string[]> }[]
}

interface Window {
  __TAURI_INTERNALS__?: TauriInternals
  /** The File System Access API's save dialog, missing from browsers that lack the API. */
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>
}
