/**
 * Where the open project lives on disk, and how to save it there.
 *
 * In the desktop app (Tauri) "Lưu" opens the native Save dialog the first time, then writes back to
 * the same file; "Lưu thành…" always asks. Opening a project through the native Open dialog makes
 * that file the current one, so Ctrl+S overwrites it. Loading anything else (New, an example, a
 * lesson, a browser file input) forgets the current file, so a save never lands on the wrong project.
 *
 * In a browser, the File System Access API (`showSaveFilePicker`) gives the same behaviour where it
 * exists; elsewhere a save falls back to a download.
 */
import downloadBlob from './download-blob';

const PROJECT_LOADED = 'PROJECT_LOADED';

let current = null; // {path: ?string, name: string, handle: ?FileSystemFileHandle}
let trackedEvents = null;

const tauri = () => (typeof window === 'undefined' ? null : window.__TAURI_INTERNALS__ || null);

/** @returns {boolean} whether the editor runs inside the desktop app. */
const isDesktopApp = () => !!tauri();

const basename = path => path.split(/[\\/]/).pop();

/** @returns {?{path: ?string, name: string}} the file the open project was saved to or opened from. */
const getCurrentFile = () => (current ? {path: current.path, name: current.name} : null);

const forgetCurrentFile = () => {
    current = null;
};

const onProjectLoaded = forgetCurrentFile;

/**
 * Follow project loads on the VM event bus: every load forgets the current file. The VM reports the
 * load before `vm.project.load()` resolves, so a file opened from the Open dialog is made current
 * afterwards with `setCurrentFile`.
 * @param {{on: Function, removeListener: Function}} events - the VM event bus.
 * @returns {Function} stops tracking.
 */
const trackProjectLoads = events => {
    if (trackedEvents) trackedEvents.removeListener(PROJECT_LOADED, onProjectLoaded);
    trackedEvents = events;
    events.on(PROJECT_LOADED, onProjectLoaded);
    return () => {
        events.removeListener(PROJECT_LOADED, onProjectLoaded);
        if (trackedEvents === events) trackedEvents = null;
    };
};

/**
 * @param {Blob} blob - the project.
 * @returns {Promise<Uint8Array>} its bytes.
 */
const blobBytes = blob => {
    if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer().then(b => new Uint8Array(b));
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
    });
};

const isAbort = error => error && (error.name === 'AbortError');

/**
 * Save the project.
 * @param {Blob} content - the `.tb` bytes.
 * @param {object} options - save options.
 * @param {string} options.suggestedName - file name to offer, e.g. "Dự án ThingBlock.tb".
 * @param {boolean} [options.saveAs] - always ask where to save, even when there is a current file.
 * @returns {Promise<?{path: ?string, name: string, downloaded?: boolean}>} where it was saved, or
 *   null when the user cancelled the dialog.
 */
const saveProjectFile = async (content, {suggestedName, saveAs = false}) => {
    const ipc = tauri();
    if (ipc) {
        let path = !saveAs && current && current.path;
        if (!path) {
            path = await ipc.invoke('pick_save_path', {suggestedName});
            if (!path) return null;
        }
        const bytes = await blobBytes(content);
        await ipc.invoke('write_project_file', bytes, {
            headers: {'x-project-path': encodeURIComponent(path)}
        });
        current = {path, name: basename(path), handle: null};
        return getCurrentFile();
    }
    if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
        let handle = !saveAs && current && current.handle;
        if (!handle) {
            try {
                handle = await window.showSaveFilePicker({
                    suggestedName,
                    types: [{description: 'ThingBlock', accept: {'application/x.thingblock': ['.tb']}}]
                });
            } catch (error) {
                if (isAbort(error)) return null;
                throw error;
            }
        }
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        current = {path: null, name: handle.name, handle};
        return getCurrentFile();
    }
    downloadBlob(suggestedName, content);
    return {path: null, name: suggestedName, downloaded: true};
};

/**
 * Desktop only: ask for a `.tb` file with the native Open dialog and read it. Once its bytes have
 * loaded, call `setCurrentFile(file)` so Ctrl+S writes back to it.
 * @returns {Promise<?{path: string, name: string, data: ArrayBuffer}>} null when cancelled.
 */
const pickProjectFile = async () => {
    const ipc = tauri();
    const path = await ipc.invoke('pick_open_path');
    if (!path) return null;
    const data = await ipc.invoke('read_project_file', {path});
    return {path, name: basename(path), data};
};

/**
 * Make a file the one the open project lives in.
 * @param {{path: string, name: string}} file - a file picked in the Open dialog and just loaded.
 */
const setCurrentFile = file => {
    current = {path: file.path, name: file.name, handle: null};
};

/**
 * Show the file name in the desktop window title.
 * @param {?string} name - the project's file name, or null for an unsaved project.
 */
const showFileInWindowTitle = name => {
    const ipc = tauri();
    const title = name ? `${name} — ThingBlock` : 'ThingBlock';
    if (typeof document !== 'undefined') document.title = title;
    if (ipc) ipc.invoke('set_window_title', {title}).catch(() => {});
};

export {
    forgetCurrentFile,
    getCurrentFile,
    isDesktopApp,
    pickProjectFile,
    saveProjectFile,
    setCurrentFile,
    showFileInWindowTitle,
    trackProjectLoads
};
