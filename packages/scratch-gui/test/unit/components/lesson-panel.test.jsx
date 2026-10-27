import React from 'react';
import '@testing-library/jest-dom';
import {fireEvent, within} from '@testing-library/react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import LessonPanel from '../../../src/components/lesson-panel/lesson-panel.jsx';

const lesson = {
    ma: 'den',
    ten: 'Đèn nhấp nháy',
    baseUrl: 'http://x/tutorials/den/',
    steps: [
        {
            title: 'Mở đầu',
            body: [
                {type: 'p', runs: [{text: 'Chào '}, {text: 'em', bold: true}, {text: ' nhé', italic: true}]},
                {type: 'list', items: [[{text: 'Một'}], [{text: 'Hai'}]]}
            ],
            hints: [],
            rules: [],
            pointAt: null
        },
        {
            title: 'Bật đèn',
            body: [{type: 'img', src: 'khoi.png', alt: 'Khối'}],
            hints: [[{text: 'Nhóm ThingBot'}], [{text: 'Khối '}, {text: 'set led', bold: true}]],
            rules: [{kind: 'light'}],
            pointAt: null
        }
    ]
};
const noop = () => {};
// Tests render several panels; queries are scoped to each one's container.
const renderPanel = props => {
    const view = renderWithIntl(
        <LessonPanel
            check={{status: 'idle', messages: []}}
            collapsed={false}
            hintsShown={0}
            lesson={lesson}
            passedSteps={[]}
            stepIndex={0}
            onClose={noop}
            onHint={noop}
            onNext={noop}
            onPrev={noop}
            onToggleCollapse={noop}
            {...props}
        />);
    return {...view, ...within(view.container)};
};

test('renders the lesson name, step title, body runs, list and progress', () => {
    const {container} = renderPanel();
    expect(container).toHaveTextContent('Đèn nhấp nháy');
    expect(container).toHaveTextContent('Mở đầu');
    expect(container.querySelector('strong')).toHaveTextContent('em');
    expect(container.querySelector('em')).toHaveTextContent('nhé');
    expect([...container.querySelectorAll('li')].map(li => li.textContent)).toEqual(['Một', 'Hai']);
    expect(container).toHaveTextContent('1/2');
});

test('an ungraded step has no verdict box; a graded one shows it idle', () => {
    expect(renderPanel().container.querySelector('[data-check-status]')).toBeNull();
    const box = renderPanel({stepIndex: 1}).container.querySelector('[data-check-status]');
    expect(box).toHaveAttribute('data-check-status', 'idle');
    expect(box).toHaveTextContent('Press Run to check');
});

test('prefixes image sources with the lesson base URL', () => {
    const img = renderPanel({stepIndex: 1}).container.querySelector('img');
    expect(img).toHaveAttribute('src', 'http://x/tutorials/den/khoi.png');
    expect(img).toHaveAttribute('alt', 'Khối');
});

test('shows failure messages and a passed verdict', () => {
    const failed = renderPanel({stepIndex: 1, check: {status: 'failed', messages: ['Đèn L1 chưa sáng.']}});
    expect(failed.container.querySelector('[data-check-status]')).toHaveTextContent('Đèn L1 chưa sáng.');
    const passed = renderPanel({stepIndex: 1, check: {status: 'passed', messages: []}, passedSteps: [1]});
    expect(passed.container.querySelector('[data-check-status]')).toHaveAttribute('data-check-status', 'passed');
});

test('hints appear one at a time and the Hint button goes when all are shown', () => {
    const onHint = jest.fn();
    const none = renderPanel({stepIndex: 1, hintsShown: 0, onHint});
    expect(none.container).not.toHaveTextContent('Nhóm ThingBot');
    fireEvent.click(none.getByText('Hint'));
    expect(onHint).toHaveBeenCalledTimes(1);
    const one = renderPanel({stepIndex: 1, hintsShown: 1});
    expect(one.container).toHaveTextContent('Nhóm ThingBot');
    expect(one.container).not.toHaveTextContent('set led');
    const all = renderPanel({stepIndex: 1, hintsShown: 2});
    expect(all.container).toHaveTextContent('set led');
    expect(all.queryByText('Hint')).toBeNull();
});

test('Back is disabled on the first step and Next on the last', () => {
    const first = renderPanel({stepIndex: 0});
    expect(first.getByRole('button', {name: /Back/})).toBeDisabled();
    expect(first.getByRole('button', {name: /Next/})).toBeEnabled();
    const last = renderPanel({stepIndex: 1});
    expect(last.getByRole('button', {name: /Back/})).toBeEnabled();
    expect(last.getByRole('button', {name: /Next/})).toBeDisabled();
});

test('Back, Next, close and collapse call their handlers', () => {
    const handlers = {onPrev: jest.fn(), onNext: jest.fn(), onClose: jest.fn(), onToggleCollapse: jest.fn()};
    const {getByRole, getByText} = renderPanel({stepIndex: 0, ...handlers});
    fireEvent.click(getByRole('button', {name: /Next/}));
    fireEvent.click(getByText('✕'));
    fireEvent.click(getByText('◀'));
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleCollapse).toHaveBeenCalledTimes(1);
    const second = renderPanel({stepIndex: 1, onPrev: handlers.onPrev});
    fireEvent.click(second.getByRole('button', {name: /Back/}));
    expect(handlers.onPrev).toHaveBeenCalledTimes(1);
});

test('collapsed shows only the expand button and the step counter', () => {
    const onToggleCollapse = jest.fn();
    const {container, getByText} = renderPanel({collapsed: true, stepIndex: 1, onToggleCollapse});
    expect(container).not.toHaveTextContent('Bật đèn');
    expect(container).toHaveTextContent('2/2');
    fireEvent.click(getByText('▶'));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
});
