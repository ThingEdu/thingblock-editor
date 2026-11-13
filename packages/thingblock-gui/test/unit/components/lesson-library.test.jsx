import React from 'react';
import '@testing-library/jest-dom';
import {fireEvent} from '@testing-library/react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import LessonLibrary from '../../../src/components/lesson-library/lesson-library.jsx';

jest.mock('../../../src/containers/modal.jsx', () => {
    const MockModal = ({children}) => <div>{children}</div>;
    return MockModal;
});

jest.mock('../../../src/components/library/library.jsx', () => {
    const MockLibrary = ({data, categories, onItemSelected}) => (
        <div>
            {categories.map(c => <span key={c.id}>{c.id}</span>)}
            {data.map(item => (
                <button
                    key={item.lessonId}
                    data-image={item.rawURL}
                    data-lesson={item.lessonId}
                    data-category={item.category}
                    // eslint-disable-next-line react/jsx-no-bind
                    onClick={() => onItemSelected(item)}
                >{item.name}</button>
            ))}
        </div>
    );
    return MockLibrary;
});

const BASE = 'http://x/tutorials';
const lessons = [
    {id: 'light-on-off', name: 'Bật tắt đèn', group: 'outputs', image: 'cover.png'},
    {id: 'blink', name: 'Đèn nhấp nháy', group: 'outputs', image: null}
];

const renderLibrary = props => renderWithIntl(
    <LessonLibrary
        lessons={lessons}
        tutorialsBase={BASE}
        loading={false}
        error={null}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        {...props}
    />
);

test('lists lessons as library items with their image or a placeholder, sectioned by group', () => {
    const {container} = renderLibrary();
    const withImage = container.querySelector('[data-lesson="light-on-off"]');
    expect(withImage).toHaveAttribute('data-image', `${BASE}/light-on-off/cover.png`);
    expect(withImage).toHaveAttribute('data-category', 'outputs');
    expect(withImage).toHaveTextContent('Bật tắt đèn');
    const withoutImage = container.querySelector('[data-lesson="blink"]');
    expect(withoutImage.getAttribute('data-image')).not.toContain(BASE);
});

test('selecting a lesson reports its id', () => {
    const onSelect = jest.fn();
    const {container} = renderLibrary({onSelect});
    fireEvent.click(container.querySelector('[data-lesson="light-on-off"]'));
    expect(onSelect).toHaveBeenCalledWith('light-on-off');
});

test('explains that the helper is needed when the index cannot be reached', () => {
    const {getByText} = renderLibrary({lessons: [], error: 'no-link'});
    expect(getByText('Lessons need the ThingBlock Link helper. Start it and try again.')).toBeInTheDocument();
});
