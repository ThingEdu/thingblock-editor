import saveProject, {getProjectFilename} from '../../../src/lib/save-project';
import {forgetCurrentFile} from '../../../src/lib/project-file';
import alertsReducer from '../../../src/reducers/alerts';

const blob = () => new Blob([new Uint8Array([7])]);

const desktop = savePath => {
    window.__TAURI_INTERNALS__ = {
        invoke: jest.fn(cmd => Promise.resolve(cmd === 'pick_save_path' ? savePath : undefined))
    };
};

afterEach(() => {
    delete window.__TAURI_INTERNALS__;
    forgetCurrentFile();
});

test('offers the project title as the file name', () => {
    expect(getProjectFilename('Xe dò line')).toBe('Xe dò line.tb');
    expect(getProjectFilename('', 'Dự án ThingBlock')).toBe('Dự án ThingBlock.tb');
});

test('after saving, says where and names the project after the file', async () => {
    jest.useFakeTimers();
    desktop('/Users/em/Xe dò line.tb');
    const dispatch = jest.fn();
    const saved = await saveProject({saveProjectSb3: async () => blob(), projectTitle: 'Dự án ThingBlock', dispatch});
    expect(saved.path).toBe('/Users/em/Xe dò line.tb');
    const actions = dispatch.mock.calls.map(([action]) => action);
    expect(actions).toEqual(expect.arrayContaining([
        expect.objectContaining({title: 'Xe dò line'}),
        expect.objectContaining({alertId: 'savedToFile', data: {path: '/Users/em/Xe dò line.tb'}})
    ]));

    // The alert renders the path it was shown with.
    const alert = actions.find(action => action.alertId === 'savedToFile');
    const state = alertsReducer(undefined, alert); // eslint-disable-line no-undefined
    const shown = state.alertsList.find(a => a.alertId === 'savedToFile');
    expect(shown.content.props.values).toEqual({path: '/Users/em/Xe dò line.tb'});
    expect(shown.content.props.id).toBe('gui.alerts.savedToFile');
    jest.useRealTimers();
});

test('a cancelled dialog shows nothing', async () => {
    desktop(null);
    const dispatch = jest.fn();
    await expect(saveProject({saveProjectSb3: async () => blob(), projectTitle: 'x', dispatch})).resolves.toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
});

test('a failed save shows an error alert instead of throwing', async () => {
    jest.useFakeTimers();
    window.__TAURI_INTERNALS__ = {
        invoke: jest.fn(cmd => (cmd === 'pick_save_path' ?
            Promise.resolve('/ro/x.tb') :
            Promise.reject(new Error('Permission denied'))))
    };
    const dispatch = jest.fn();
    await expect(saveProject({saveProjectSb3: async () => blob(), projectTitle: 'x', dispatch})).resolves.toBeNull();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
        alertId: 'saveToFileError', data: {message: 'Permission denied'}
    }));
    jest.useRealTimers();
});
