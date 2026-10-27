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

const renderLibrary = root => {
    const store = configureStore()({scratchGui: {vm: {getResourceRoot: () => root}}, locales: {isRtl: false}});
    const view = renderWithIntl(
        <Provider store={store}>
            <LessonLibrary />
        </Provider>
    );
    return {store, ...view};
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
    await waitFor(() => expect(store.getActions()).toHaveLength(3));
    expect(global.fetch).toHaveBeenCalledWith(`${ROOT}/tutorials/den-nhap-nhay/bai.vi.json`);
    const [device, open, close] = store.getActions();
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
    await waitFor(() => expect(store.getActions()).toHaveLength(2));
    const [open, close] = store.getActions();
    expect(open.lesson.bo).toBe('khong');
    expect(store.getActions().map(action => action.type)).not.toContain('scratch-gui/board/SET_DEVICE');
    expect(open.type).toBe('scratch-gui/lesson/OPEN');
    expect(close.type).toMatch(/CLOSE_MODAL/);
});
