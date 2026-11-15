import React from 'react';
import '@testing-library/jest-dom';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import {fireEvent, waitFor} from '@testing-library/react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import LessonLibrary from '../../../src/containers/lesson-library.jsx';

jest.mock('../../../src/containers/modal.jsx', () => {
    const MockModal = ({children}) => <div>{children}</div>;
    return MockModal;
});

jest.mock('../../../src/components/library/library.jsx', () => {
    const MockLibrary = ({data, onItemSelected}) => (
        <div>
            {data.map(item => (
                <button
                    key={item.lessonId}
                    data-lesson={item.lessonId}
                    // eslint-disable-next-line react/jsx-no-bind
                    onClick={() => onItemSelected(item)}
                >{item.name}</button>
            ))}
        </div>
    );
    return MockLibrary;
});

const ROOT = 'http://localhost:3030/resources';
const entry = (id, name, group, order, stepCount, gradedCount) => ({
    id, name, group, order, stepCount, gradedCount, image: null, duration: 10, langs: ['vi']
});
const INDEX = {lessons: [
    entry('blink', 'Đèn nhấp nháy', 'outputs', 2, 4, 2),
    entry('hello', 'Chào bạn', 'getting-started', 1, 3, 1)
]};
const LESSON = {id: 'blink', name: 'Đèn nhấp nháy', group: 'outputs', order: 2, board: 'thingbot', steps: []};

const respond = body => Promise.resolve({ok: true, json: () => Promise.resolve(body)});

const renderLibrary = (
    root,
    addPeripheral = jest.fn(() => Promise.resolve()),
    {projectChanged = false, extensionManager} = {}
) => {
    const devices = {getTutorialsOrigin: () => (root ? `${root}/tutorials` : null), addPeripheral};
    const project = {load: jest.fn(() => Promise.resolve())};
    const store = configureStore()({
        scratchGui: {vm: {devices, project, extensionManager}, projectChanged},
        locales: {isRtl: false}
    });
    const view = renderWithIntl(
        <Provider store={store}>
            <LessonLibrary />
        </Provider>
    );
    return {store, project, ...view};
};

beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn(url => respond(url.endsWith('index.json') ? INDEX : LESSON));
});

afterEach(() => {
    delete global.fetch;
});

test('shows the lessons from the index', async () => {
    const {getByText} = renderLibrary(ROOT);
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(`${ROOT}/tutorials/index.json`);
    expect(getByText('Chào bạn')).toBeInTheDocument();
});

test('opening a lesson selects its board, opens it with saved progress and closes the library', async () => {
    window.localStorage.setItem('thingblock.lesson.blink', JSON.stringify({stepIndex: 2, passedSteps: [1]}));
    const {container, getByText, store} = renderLibrary(ROOT);
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-lesson="blink"]'));
    await waitFor(() => expect(store.getActions()).toHaveLength(5));
    expect(global.fetch).toHaveBeenCalledWith(`${ROOT}/tutorials/blink/lesson.vi.json`);
    const [unchanged, title, device, open, close] = store.getActions();
    expect(unchanged).toEqual({type: 'scratch-gui/project-changed/SET_PROJECT_CHANGED', changed: false});
    expect(title.title).toBe('Đèn nhấp nháy');
    expect(device.deviceId).toBe('thingbot');
    expect(open.lesson).toEqual({...LESSON, baseUrl: `${ROOT}/tutorials/blink/`});
    expect(open.progress).toEqual({stepIndex: 2, passedSteps: [1]});
    expect(close.type).toMatch(/CLOSE_MODAL/);
});

test('without a helper the library explains what is missing and fetches nothing', () => {
    const {getByText} = renderLibrary(null);
    expect(getByText('Lessons need the ThingBlock Link helper. Start it and try again.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
});

test('an unreachable index shows the same explanation', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    const {getByText} = renderLibrary(ROOT);
    await waitFor(() => expect(
        getByText('Lessons need the ThingBlock Link helper. Start it and try again.')
    ).toBeInTheDocument());
});

test('a boardless lesson opens without selecting a device', async () => {
    const boardless = {...LESSON, board: 'none'};
    global.fetch = jest.fn(url => respond(url.endsWith('index.json') ? INDEX : boardless));
    const {container, getByText, store} = renderLibrary(ROOT);
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-lesson="blink"]'));
    await waitFor(() => expect(store.getActions()).toHaveLength(4));
    const [, , open, close] = store.getActions();
    expect(open.lesson.board).toBe('none');
    expect(store.getActions().map(action => action.type)).not.toContain('scratch-gui/board/SET_DEVICE');
    expect(open.type).toBe('scratch-gui/lesson/OPEN');
    expect(close.type).toMatch(/CLOSE_MODAL/);
});

test('a Camera AI lesson opens without a board and loads the extension it names', async () => {
    const camera = {...LESSON, board: 'none', group: 'camera-ai', extensions: ['cameraAi']};
    global.fetch = jest.fn(url => respond(url.endsWith('index.json') ? INDEX : camera));
    const extensionManager = {
        isExtensionLoaded: jest.fn(() => false),
        loadExtensionURL: jest.fn(() => Promise.resolve())
    };
    const {container, getByText, project, store} = renderLibrary(ROOT, jest.fn(() => Promise.resolve()), {extensionManager});
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-lesson="blink"]'));
    await waitFor(() => expect(extensionManager.loadExtensionURL).toHaveBeenCalledWith('cameraAi'));
    expect(project.load.mock.calls[0][0].board).toBeNull();
    expect(store.getActions().map(action => action.type)).not.toContain('scratch-gui/board/SET_DEVICE');
});

test('an extension already in the editor is not loaded twice', async () => {
    const camera = {...LESSON, board: 'none', extensions: ['cameraAi']};
    global.fetch = jest.fn(url => respond(url.endsWith('index.json') ? INDEX : camera));
    const extensionManager = {isExtensionLoaded: jest.fn(() => true), loadExtensionURL: jest.fn()};
    const {container, getByText, store} = renderLibrary(ROOT, jest.fn(() => Promise.resolve()), {extensionManager});
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-lesson="blink"]'));
    await waitFor(() => expect(store.getActions().map(a => a.type)).toContain('scratch-gui/lesson/OPEN'));
    expect(extensionManager.isExtensionLoaded).toHaveBeenCalledWith('cameraAi');
    expect(extensionManager.loadExtensionURL).not.toHaveBeenCalled();
});

test('opening a lesson adds the peripherals it needs, after selecting its board', async () => {
    const withOled = {...LESSON, peripherals: ['oled']};
    global.fetch = jest.fn(url => respond(url.endsWith('index.json') ? INDEX : withOled));
    const seen = {};
    const addPeripheral = jest.fn(() => {
        expect(seen.store.getActions().map(a => a.type)).toContain('scratch-gui/board/SET_DEVICE');
        return Promise.resolve();
    });
    const view = renderLibrary(ROOT, addPeripheral);
    seen.store = view.store;
    await waitFor(() => expect(view.getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(view.container.querySelector('[data-lesson="blink"]'));
    await waitFor(() => expect(addPeripheral).toHaveBeenCalledWith('oled'));
    expect(addPeripheral).toHaveBeenCalledTimes(1);
});

test('opening a lesson starts a blank project on its board, instead of keeping the previous blocks', async () => {
    const withOled = {...LESSON, peripherals: ['oled']};
    global.fetch = jest.fn(url => respond(url.endsWith('index.json') ? INDEX : withOled));
    const {container, getByText, project, store} = renderLibrary(ROOT);
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-lesson="blink"]'));
    await waitFor(() => expect(store.getActions().map(a => a.type)).toContain('scratch-gui/lesson/OPEN'));
    expect(project.load).toHaveBeenCalledTimes(1);
    const loaded = project.load.mock.calls[0][0];
    expect(loaded.board).toEqual({device: 'thingbot', peripherals: ['oled']});
    for (const target of loaded.targets) {
        expect(target.costumes.length).toBeGreaterThan(0);
        expect(target.blocks).toEqual({});
    }
});

test('a lesson with a starting project opens that project', async () => {
    const starting = {...LESSON, start: 'start.tb'};
    const bytes = new ArrayBuffer(4);
    global.fetch = jest.fn(url => {
        if (url.endsWith('index.json')) return respond(INDEX);
        if (url.endsWith('start.tb')) return Promise.resolve({ok: true, arrayBuffer: () => Promise.resolve(bytes)});
        return respond(starting);
    });
    const {container, getByText, project, store} = renderLibrary(ROOT);
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-lesson="blink"]'));
    await waitFor(() => expect(store.getActions().map(a => a.type)).toContain('scratch-gui/lesson/OPEN'));
    expect(global.fetch).toHaveBeenCalledWith(`${ROOT}/tutorials/blink/start.tb`);
    expect(project.load).toHaveBeenCalledWith(bytes);
});

test('a changed project is only replaced when the learner confirms', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    try {
        const {container, getByText, project, store} = renderLibrary(ROOT, jest.fn(() => Promise.resolve()), {projectChanged: true});
        await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
        fireEvent.click(container.querySelector('[data-lesson="blink"]'));
        await waitFor(() => expect(confirm).toHaveBeenCalledWith('Replace contents of the current project?'));
        expect(project.load).not.toHaveBeenCalled();
        expect(store.getActions()).toEqual([]);
    } finally {
        confirm.mockRestore();
    }
});
