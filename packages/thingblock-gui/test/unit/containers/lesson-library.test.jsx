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

const ROOT = 'http://localhost:3030/resources';
const entry = (ma, ten, nhom, thuTu, stepCount, gradedCount) => ({
    ma, ten, nhom, thuTu, stepCount, gradedCount, thoiLuong: 10, langs: ['vi']
});
const INDEX = {lessons: [
    entry('den-nhap-nhay', 'Đèn nhấp nháy', 'dau-ra', 2, 4, 2),
    entry('chao-ban', 'Chào bạn', 'lam-quen', 1, 3, 1)
]};
const LESSON = {ma: 'den-nhap-nhay', ten: 'Đèn nhấp nháy', nhom: 'dau-ra', thuTu: 2, bo: 'thingbot', steps: []};

const respond = body => Promise.resolve({ok: true, json: () => Promise.resolve(body)});

const renderLibrary = (root, addPeripheral = jest.fn(() => Promise.resolve()), {projectChanged = false} = {}) => {
    const devices = {getTutorialsOrigin: () => (root ? `${root}/tutorials` : null), addPeripheral};
    const project = {load: jest.fn(() => Promise.resolve())};
    const store = configureStore()({
        scratchGui: {vm: {devices, project}, projectChanged},
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

test('shows the index groups in the fixed order with saved progress', async () => {
    window.localStorage.setItem('thingblock.lesson.den-nhap-nhay', JSON.stringify({stepIndex: 2, passedSteps: [1]}));
    const {container, getByText} = renderLibrary(ROOT);
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(`${ROOT}/tutorials/index.json`);
    const titles = [...container.querySelectorAll('h3')].map(h => h.textContent);
    expect(titles).toEqual(['Getting started', 'Outputs: lights and buzzer']);
    expect(container.querySelector('[data-lesson="den-nhap-nhay"]')).toHaveAttribute('data-progress', '2/4');
});

test('opening a lesson selects its board, opens it with saved progress and closes the library', async () => {
    window.localStorage.setItem('thingblock.lesson.den-nhap-nhay', JSON.stringify({stepIndex: 2, passedSteps: [1]}));
    const {container, getByText, store} = renderLibrary(ROOT);
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-lesson="den-nhap-nhay"]'));
    await waitFor(() => expect(store.getActions()).toHaveLength(5));
    expect(global.fetch).toHaveBeenCalledWith(`${ROOT}/tutorials/den-nhap-nhay/bai.vi.json`);
    const [unchanged, title, device, open, close] = store.getActions();
    expect(unchanged).toEqual({type: 'scratch-gui/project-changed/SET_PROJECT_CHANGED', changed: false});
    expect(title.title).toBe('Đèn nhấp nháy');
    expect(device.deviceId).toBe('thingbot');
    expect(open.lesson).toEqual({...LESSON, baseUrl: `${ROOT}/tutorials/den-nhap-nhay/`});
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
    const boardless = {...LESSON, bo: 'khong'};
    global.fetch = jest.fn(url => respond(url.endsWith('index.json') ? INDEX : boardless));
    const {container, getByText, store} = renderLibrary(ROOT);
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-lesson="den-nhap-nhay"]'));
    await waitFor(() => expect(store.getActions()).toHaveLength(4));
    const [, , open, close] = store.getActions();
    expect(open.lesson.bo).toBe('khong');
    expect(store.getActions().map(action => action.type)).not.toContain('scratch-gui/board/SET_DEVICE');
    expect(open.type).toBe('scratch-gui/lesson/OPEN');
    expect(close.type).toMatch(/CLOSE_MODAL/);
});

test('opening a lesson adds the peripherals it needs, after selecting its board', async () => {
    const withOled = {...LESSON, thietBi: ['oled']};
    global.fetch = jest.fn(url => respond(url.endsWith('index.json') ? INDEX : withOled));
    const seen = {};
    const addPeripheral = jest.fn(() => {
        expect(seen.store.getActions().map(a => a.type)).toContain('scratch-gui/board/SET_DEVICE');
        return Promise.resolve();
    });
    const view = renderLibrary(ROOT, addPeripheral);
    seen.store = view.store;
    await waitFor(() => expect(view.getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(view.container.querySelector('[data-lesson="den-nhap-nhay"]'));
    await waitFor(() => expect(addPeripheral).toHaveBeenCalledWith('oled'));
    expect(addPeripheral).toHaveBeenCalledTimes(1);
});

test('opening a lesson starts a blank project on its board, instead of keeping the previous blocks', async () => {
    const withOled = {...LESSON, thietBi: ['oled']};
    global.fetch = jest.fn(url => respond(url.endsWith('index.json') ? INDEX : withOled));
    const {container, getByText, project, store} = renderLibrary(ROOT);
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-lesson="den-nhap-nhay"]'));
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
    const starting = {...LESSON, batDau: 'bat-dau.tb'};
    const bytes = new ArrayBuffer(4);
    global.fetch = jest.fn(url => {
        if (url.endsWith('index.json')) return respond(INDEX);
        if (url.endsWith('bat-dau.tb')) return Promise.resolve({ok: true, arrayBuffer: () => Promise.resolve(bytes)});
        return respond(starting);
    });
    const {container, getByText, project, store} = renderLibrary(ROOT);
    await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-lesson="den-nhap-nhay"]'));
    await waitFor(() => expect(store.getActions().map(a => a.type)).toContain('scratch-gui/lesson/OPEN'));
    expect(global.fetch).toHaveBeenCalledWith(`${ROOT}/tutorials/den-nhap-nhay/bat-dau.tb`);
    expect(project.load).toHaveBeenCalledWith(bytes);
});

test('a changed project is only replaced when the learner confirms', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    try {
        const {container, getByText, project, store} = renderLibrary(ROOT, jest.fn(() => Promise.resolve()), {projectChanged: true});
        await waitFor(() => expect(getByText('Đèn nhấp nháy')).toBeInTheDocument());
        fireEvent.click(container.querySelector('[data-lesson="den-nhap-nhay"]'));
        await waitFor(() => expect(confirm).toHaveBeenCalledWith('Replace contents of the current project?'));
        expect(project.load).not.toHaveBeenCalled();
        expect(store.getActions()).toEqual([]);
    } finally {
        confirm.mockRestore();
    }
});
