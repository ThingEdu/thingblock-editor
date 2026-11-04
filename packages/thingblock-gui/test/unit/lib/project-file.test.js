import EventEmitter from 'events';
import {
    forgetCurrentFile,
    getCurrentFile,
    isDesktopApp,
    pickProjectFile,
    saveProjectFile,
    setCurrentFile,
    showFileInWindowTitle,
    trackProjectLoads
} from '../../../src/lib/project-file';
import downloadBlob from '../../../src/lib/download-blob';

jest.mock('../../../src/lib/download-blob', () => jest.fn());

const project = () => new Blob([new Uint8Array([1, 2, 3])]);

/** A fake Tauri IPC whose Save/Open dialogs answer from a queue. */
const installTauri = ({savePaths = [], openPaths = [], files = {}} = {}) => {
    const written = {};
    const calls = [];
    window.__TAURI_INTERNALS__ = {
        invoke: jest.fn((cmd, args, options) => {
            calls.push(cmd);
            switch (cmd) {
            case 'pick_save_path': return Promise.resolve(savePaths.shift() ?? null);
            case 'pick_open_path': return Promise.resolve(openPaths.shift() ?? null);
            case 'write_project_file':
                written[decodeURIComponent(options.headers['x-project-path'])] = Array.from(args);
                return Promise.resolve();
            case 'read_project_file': return Promise.resolve(files[args.path]);
            case 'set_window_title': return Promise.resolve();
            default: return Promise.reject(new Error(`unexpected ${cmd}`));
            }
        })
    };
    return {written, calls};
};

afterEach(() => {
    delete window.__TAURI_INTERNALS__;
    delete window.showSaveFilePicker;
    forgetCurrentFile();
    downloadBlob.mockClear();
});

describe('desktop app', () => {
    test('first save asks where, then Ctrl+S writes back to the same file without asking', async () => {
        const {written, calls} = installTauri({savePaths: ['/Users/em/Tài liệu/Xe dò line.tb']});
        expect(isDesktopApp()).toBe(true);

        const first = await saveProjectFile(project(), {suggestedName: 'Dự án ThingBlock.tb'});
        expect(first).toEqual({path: '/Users/em/Tài liệu/Xe dò line.tb', name: 'Xe dò line.tb'});
        expect(written['/Users/em/Tài liệu/Xe dò line.tb']).toEqual([1, 2, 3]);
        expect(window.__TAURI_INTERNALS__.invoke).toHaveBeenCalledWith(
            'pick_save_path', {suggestedName: 'Dự án ThingBlock.tb'});

        calls.length = 0;
        const second = await saveProjectFile(project(), {suggestedName: 'Dự án ThingBlock.tb'});
        expect(second.path).toBe('/Users/em/Tài liệu/Xe dò line.tb');
        expect(calls).toEqual(['write_project_file']);
    });

    test('"Save as" always asks, and the new file becomes current', async () => {
        installTauri({savePaths: ['/a/one.tb', '/a/two.tb']});
        await saveProjectFile(project(), {suggestedName: 'x.tb'});
        const saved = await saveProjectFile(project(), {suggestedName: 'x.tb', saveAs: true});
        expect(saved.path).toBe('/a/two.tb');
        expect(getCurrentFile().path).toBe('/a/two.tb');
    });

    test('cancelling the dialog saves nothing and is not an error', async () => {
        const {written} = installTauri({savePaths: [null]});
        await expect(saveProjectFile(project(), {suggestedName: 'x.tb'})).resolves.toBeNull();
        expect(written).toEqual({});
        expect(getCurrentFile()).toBeNull();
    });

    test('a write failure rejects and keeps no current file', async () => {
        installTauri({savePaths: ['/ro/x.tb']});
        window.__TAURI_INTERNALS__.invoke.mockImplementation(cmd => (cmd === 'pick_save_path' ?
            Promise.resolve('/ro/x.tb') :
            Promise.reject(new Error('Permission denied'))));
        await expect(saveProjectFile(project(), {suggestedName: 'x.tb'})).rejects.toThrow('Permission denied');
        expect(getCurrentFile()).toBeNull();
    });

    test('opening a file through the Open dialog makes Ctrl+S overwrite it', async () => {
        const data = new ArrayBuffer(4);
        const {calls} = installTauri({openPaths: ['C:\\Hoc\\robot.tb'], files: {'C:\\Hoc\\robot.tb': data}});
        const file = await pickProjectFile();
        expect(file).toEqual({path: 'C:\\Hoc\\robot.tb', name: 'robot.tb', data});
        setCurrentFile(file);

        calls.length = 0;
        const saved = await saveProjectFile(project(), {suggestedName: 'robot.tb'});
        expect(saved.path).toBe('C:\\Hoc\\robot.tb');
        expect(calls).toEqual(['write_project_file']);
    });

    test('a cancelled Open dialog reads nothing', async () => {
        const {calls} = installTauri({openPaths: [null]});
        await expect(pickProjectFile()).resolves.toBeNull();
        expect(calls).toEqual(['pick_open_path']);
    });

    test('loading another project forgets the file, so Ctrl+S asks again', async () => {
        const events = new EventEmitter();
        const stop = trackProjectLoads(events);
        installTauri({savePaths: ['/a/one.tb', '/a/two.tb']});
        await saveProjectFile(project(), {suggestedName: 'x.tb'});
        events.emit('PROJECT_LOADED'); // e.g. an example or a lesson opened
        expect(getCurrentFile()).toBeNull();
        const saved = await saveProjectFile(project(), {suggestedName: 'x.tb'});
        expect(saved.path).toBe('/a/two.tb');
        stop();
        events.emit('PROJECT_LOADED');
        expect(getCurrentFile().path).toBe('/a/two.tb');
    });

    test('the window title names the file', () => {
        installTauri();
        showFileInWindowTitle('Xe dò line.tb');
        expect(window.__TAURI_INTERNALS__.invoke).toHaveBeenCalledWith(
            'set_window_title', {title: 'Xe dò line.tb — ThingBlock'});
        expect(document.title).toBe('Xe dò line.tb — ThingBlock');
        showFileInWindowTitle(null);
        expect(document.title).toBe('ThingBlock');
    });
});

describe('browser', () => {
    test('uses the save file picker when there is one, and reuses the handle on the next save', async () => {
        const write = jest.fn();
        const handle = {name: 'bai.tb', createWritable: jest.fn(async () => ({write, close: jest.fn()}))};
        window.showSaveFilePicker = jest.fn(async () => handle);
        expect(isDesktopApp()).toBe(false);

        await expect(saveProjectFile(project(), {suggestedName: 'x.tb'}))
            .resolves.toEqual({path: null, name: 'bai.tb'});
        await saveProjectFile(project(), {suggestedName: 'x.tb'});
        expect(window.showSaveFilePicker).toHaveBeenCalledTimes(1);
        expect(write).toHaveBeenCalledTimes(2);
        expect(downloadBlob).not.toHaveBeenCalled();
    });

    test('a cancelled save file picker is not an error', async () => {
        window.showSaveFilePicker = jest.fn(async () => {
            const error = new Error('The user aborted a request.');
            error.name = 'AbortError';
            throw error;
        });
        await expect(saveProjectFile(project(), {suggestedName: 'x.tb'})).resolves.toBeNull();
    });

    test('without a picker the project is downloaded as before', async () => {
        const content = project();
        await expect(saveProjectFile(content, {suggestedName: 'Dự án ThingBlock.tb'}))
            .resolves.toEqual({path: null, name: 'Dự án ThingBlock.tb', downloaded: true});
        expect(downloadBlob).toHaveBeenCalledWith('Dự án ThingBlock.tb', content);
    });
});
