import PropTypes from 'prop-types';
import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import Modal from '../../containers/modal.jsx';
import LibraryComponent from '../library/library.jsx';
import placeholderImage from './lesson-placeholder.svg';
import cameraAiImage from './lesson-group-camera-ai.svg';
import gettingStartedImage from './lesson-group-getting-started.svg';
import inputsImage from './lesson-group-inputs.svg';
import motorsImage from './lesson-group-motors.svg';
import outputsImage from './lesson-group-outputs.svg';
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
    },
    cameraAi: {
        defaultMessage: 'Camera AI (no board)',
        description: 'Lesson group: lessons with the webcam and the Camera AI blocks, which need no board',
        id: 'gui.lessonLibrary.group.cameraAi'
    }
});

/**
 * Lesson groups as the library's sections, in the order the lessons are taught. `image` is the card
 * picture of a lesson in the group that names no `image` of its own.
 */
const GROUPS = [
    {id: 'getting-started', intlLabel: messages.gettingStarted, image: gettingStartedImage},
    {id: 'outputs', intlLabel: messages.outputs, image: outputsImage},
    {id: 'motors', intlLabel: messages.motors, image: motorsImage},
    {id: 'inputs', intlLabel: messages.inputs, image: inputsImage},
    {id: 'camera-ai', intlLabel: messages.cameraAi, image: cameraAiImage}
];

const groupImage = group => {
    const found = GROUPS.find(g => g.id === group);
    return found ? found.image : placeholderImage;
};

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
        rawURL: lesson.image ? `${tutorialsBase}/${lesson.id}/${lesson.image}` : groupImage(lesson.group),
        category: lesson.group,
        featured: true
    }));
    return (
        <LibraryComponent
            categories={GROUPS}
            data={data}
            id="lessonLibrary"
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
