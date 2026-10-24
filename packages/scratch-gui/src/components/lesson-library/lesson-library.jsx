import PropTypes from 'prop-types';
import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import Modal from '../../containers/modal.jsx';
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
    }
});

const LessonLibrary = ({groups, loading, error, progressByMa, onClose, onSelect}) => {
    const intl = useIntl();
    const handleClick = useCallback(e => onSelect(e.currentTarget.dataset.lesson), [onSelect]);
    return (
        <Modal
            fullScreen
            contentLabel={intl.formatMessage(messages.title)}
            id="lessonLibrary"
            onRequestClose={onClose}
        >
            <div className={styles.body}>
                {loading && <p className={styles.status}>{intl.formatMessage(messages.loading)}</p>}
                {error && <p className={styles.status}>{intl.formatMessage(messages.noLink)}</p>}
                {groups.map(group => (
                    <section
                        key={group.id}
                        className={styles.group}
                    >
                        <h3 className={styles.groupTitle}>{group.title}</h3>
                        <div className={styles.grid}>
                            {group.lessons.map(lesson => {
                                const progress = progressByMa[lesson.ma];
                                const done = progress && progress.passedSteps.length >= lesson.gradedCount;
                                const label = progress ? `${progress.stepIndex}/${lesson.stepCount}` : null;
                                return (
                                    <button
                                        key={lesson.ma}
                                        className={styles.card}
                                        data-lesson={lesson.ma}
                                        data-progress={label}
                                        type="button"
                                        onClick={handleClick}
                                    >
                                        <span className={styles.cardTitle}>{lesson.ten}</span>
                                        {lesson.thoiLuong && <span className={styles.meta}>{lesson.thoiLuong}′</span>}
                                        {done ? <span className={styles.done}>✔</span> : label && (
                                            <span className={styles.progress}>
                                                <span
                                                    style={{width: `${(progress.stepIndex / lesson.stepCount) * 100}%`}}
                                                />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </Modal>
    );
};

LessonLibrary.propTypes = {
    groups: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.node.isRequired,
        lessons: PropTypes.arrayOf(PropTypes.shape({
            ma: PropTypes.string.isRequired,
            ten: PropTypes.string.isRequired,
            thoiLuong: PropTypes.number,
            stepCount: PropTypes.number,
            gradedCount: PropTypes.number
        })).isRequired
    })).isRequired,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    progressByMa: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired
};

export default LessonLibrary;
