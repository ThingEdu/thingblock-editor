import React from 'react';
import '@testing-library/jest-dom';
import {fireEvent} from '@testing-library/react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import LessonLibrary from '../../../src/components/lesson-library/lesson-library.jsx';

jest.mock('../../../src/containers/modal.jsx', () => {
    const MockModal = ({children}) => <div>{children}</div>;
    return MockModal;
});

const groups = [{
    id: 'dau-ra',
    title: 'Đầu ra',
    lessons: [{ma: 'bat-tat-den', ten: 'Bật tắt đèn', thoiLuong: 10, stepCount: 4, gradedCount: 3}]
}];

const renderLibrary = props => renderWithIntl(
    <LessonLibrary
        groups={groups}
        loading={false}
        error={null}
        progressByMa={{}}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        {...props}
    />
);

test('lists lessons by group with a progress bar for a lesson in progress', () => {
    const {container, getByText, queryByText} = renderLibrary({
        progressByMa: {'bat-tat-den': {stepIndex: 1, passedSteps: [1]}}
    });
    expect(getByText('Đầu ra')).toBeInTheDocument();
    expect(getByText('Bật tắt đèn')).toBeInTheDocument();
    expect(container.querySelector('[data-lesson="bat-tat-den"]')).toHaveAttribute('data-progress', '1/4');
    expect(queryByText('✔')).toBeNull();
});

test('marks a lesson done once every graded step has passed', () => {
    const {getByText} = renderLibrary({
        progressByMa: {'bat-tat-den': {stepIndex: 3, passedSteps: [0, 1, 2]}}
    });
    expect(getByText('✔')).toBeInTheDocument();
});

test('a lesson without saved progress has no progress label', () => {
    const {container} = renderLibrary();
    expect(container.querySelector('[data-lesson="bat-tat-den"]')).not.toHaveAttribute('data-progress');
});

test('selecting a lesson reports its ma', () => {
    const onSelect = jest.fn();
    const {container} = renderLibrary({onSelect});
    fireEvent.click(container.querySelector('button[data-lesson="bat-tat-den"]'));
    expect(onSelect).toHaveBeenCalledWith('bat-tat-den');
});

test('explains that the helper is needed when the index cannot be reached', () => {
    const {getByText} = renderLibrary({groups: [], error: 'no-link'});
    expect(getByText('Lessons need the ThingBlock Link helper. Start it and try again.')).toBeInTheDocument();
});
