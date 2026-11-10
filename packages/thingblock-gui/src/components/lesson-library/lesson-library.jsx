import PropTypes from 'prop-types';
import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import Modal from '../../containers/modal.jsx';
import LibraryComponent from '../library/library.jsx';
import placeholderImage from './lesson-placeholder.svg';
import styles from './lesson-library.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Lessons',
        description: 'Lesson library title',
        id: 'gui.lessonLibrary.title'
    },
    loading: {
        defaultMessage: 'Loading lessons…',
        description: 'Lesson library loading',
        id: 'gui.lessonLibrary.loading'
    },
    noLink: {
        defaultMessage: 'Lessons need the ThingBlock Link helper. Start it and try again.',
        description: 'Lesson library cannot reach the resource server',
        id: 'gui.lessonLibrary.noLink'
    },
    gettingStarted: {
        defaultMessage: 'Getting started',
        description: 'Lesson group',
        id: 'gui.lessonLibrary.group.gettingStarted'
    },
    outputs: {
        defaultMessage: 'Outputs: lights and buzzer',
        description: 'Lesson group',
        id: 'gui.lessonLibrary.group.outputs'
    },
    motors: {
        defaultMessage: 'Motors and servos',
        description: 'Lesson group',
        id: 'gui.lessonLibrary.group.motors'
    },
    inputs: {
        defaultMessage: 'Inputs and the OLED',
        description: 'Lesson group',
        id: 'gui.lessonLibrary.group.inputs'
    }
});

/** Lesson groups as the library's filter tags, in the order the lessons are taught. */
const GROUP_TAGS = [
    {tag: 'getting-started', intlLabel: messages.gettingStarted},
    {tag: 'outputs', intlLabel: messages.outputs},
    {tag: 'motors', intlLabel: messages.motors},
    {tag: 'inputs', intlLabel: messages.inputs}
];

const LessonLibrary = ({lessons, tutorialsBase, loading, error, onClose, onSelect}) => {
    const intl = useIntl();
    const handleItemSelected = useCallback(item => onSelect(item.lessonId), [onSelect]);

    if (loading || error) {
        return (
            <Modal
                fullScreen
                contentLabel={intl.formatMessage(messages.title)}
                id="lessonLibrary"
                onRequestClose={onClose}
            >
                <p className={styles.status}>
                    {intl.formatMessage(error ? messages.noLink : messages.loading)}
                </p>
            </Modal>
        );
    }

    const data = lessons.map(lesson => ({
        lessonId: lesson.id,
        name: lesson.name,
        rawURL: lesson.image ? `${tutorialsBase}/${lesson.id}/${lesson.image}` : placeholderImage,
        tags: [lesson.group],
        featured: true
    }));
    return (
        <LibraryComponent
            data={data}
            id="lessonLibrary"
            tags={GROUP_TAGS}
            title={intl.formatMessage(messages.title)}
            onItemSelected={handleItemSelected}
            onRequestClose={onClose}
        />
    );
};

LessonLibrary.propTypes = {
    lessons: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        group: PropTypes.string.isRequired,
        image: PropTypes.string
    })).isRequired,
    tutorialsBase: PropTypes.string,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired
};

export default LessonLibrary;
