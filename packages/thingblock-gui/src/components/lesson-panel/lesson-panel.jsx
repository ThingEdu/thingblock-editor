import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, useIntl} from 'react-intl';
import LessonBody, {Runs} from './lesson-body.jsx';
import styles from './lesson-panel.css';

const verdictText = {
    idle: (<FormattedMessage
        defaultMessage="Press Run to check"
        description="Lesson verdict: not run yet"
        id="gui.lessonPanel.idle"
    />),
    waiting: (<FormattedMessage
        defaultMessage="Checking…"
        description="Lesson verdict: run in progress"
        id="gui.lessonPanel.waiting"
    />),
    passed: (<FormattedMessage
        defaultMessage="Well done!"
        description="Lesson verdict: passed"
        id="gui.lessonPanel.passed"
    />),
    failed: (<FormattedMessage
        defaultMessage="Not yet:"
        description="Lesson verdict: rules not met"
        id="gui.lessonPanel.failed"
    />),
    blocked: (<FormattedMessage
        defaultMessage="A block in your program has no simulation yet:"
        description="Lesson verdict: unsimulated block"
        id="gui.lessonPanel.blocked"
    />),
    error: (<FormattedMessage
        defaultMessage="The program stopped with an error:"
        description="Lesson verdict: runtime error"
        id="gui.lessonPanel.error"
    />)
};

const messages = defineMessages({
    collapse: {
        defaultMessage: 'Hide lesson',
        description: 'Button that collapses the lesson panel',
        id: 'gui.lessonPanel.collapse'
    },
    expand: {
        defaultMessage: 'Show lesson',
        description: 'Button that expands the collapsed lesson panel',
        id: 'gui.lessonPanel.expand'
    },
    close: {
        defaultMessage: 'Close lesson',
        description: 'Button that closes the lesson',
        id: 'gui.lessonPanel.close'
    },
    prev: {
        defaultMessage: 'Back',
        description: 'Previous lesson step',
        id: 'gui.lessonPanel.prev'
    },
    next: {
        defaultMessage: 'Next',
        description: 'Next lesson step',
        id: 'gui.lessonPanel.next'
    }
});

const Icon = ({path}) => (
    <svg
        className={styles.icon}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d={path} />
    </svg>
);

Icon.propTypes = {
    path: PropTypes.string.isRequired
};

const ICON_SIDEBAR = 'M4 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM6 2v12';
const ICON_PREV = 'M10 3L5 8l5 5';
const ICON_NEXT = 'M6 3l5 5-5 5';
const ICON_CLOSE = 'M4 4l8 8M12 4l-8 8';

const IconButton = ({className, label, path, ...props}) => (
    <button
        aria-label={label}
        className={classNames(styles.iconButton, className)}
        title={label}
        type="button"
        {...props}
    >
        <Icon path={path} />
    </button>
);

IconButton.propTypes = {
    className: PropTypes.string,
    label: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired
};

const LessonPanel = ({
    lesson, stepIndex, passedSteps, hintsShown, check, collapsed,
    onPrev, onNext, onHint, onClose, onToggleCollapse
}) => {
    const intl = useIntl();
    const step = lesson.steps[stepIndex];
    const total = lesson.steps.length;
    const graded = step.rules.length > 0;
    if (collapsed) {
        return (
            <aside className={classNames(styles.panel, styles.collapsed)}>
                <header className={styles.header}>
                    <IconButton
                        label={intl.formatMessage(messages.expand)}
                        path={ICON_SIDEBAR}
                        onClick={onToggleCollapse}
                    />
                </header>
                <div className={styles.card}>
                    <span className={styles.collapsedLabel}>{stepIndex + 1}/{total}</span>
                </div>
            </aside>
        );
    }
    return (
        <aside
            className={styles.panel}
            data-tour="lesson-panel"
        >
            <header className={styles.header}>
                <IconButton
                    label={intl.formatMessage(messages.collapse)}
                    path={ICON_SIDEBAR}
                    onClick={onToggleCollapse}
                />
                <IconButton
                    label={intl.formatMessage(messages.close)}
                    path={ICON_CLOSE}
                    onClick={onClose}
                />
            </header>
            <div className={styles.card}>
                <section className={styles.content}>
                    <div
                        className={styles.lessonName}
                        title={lesson.name}
                    >{lesson.name}</div>
                    <h2 className={styles.stepTitle}>{step.title}</h2>
                    <LessonBody
                        baseUrl={lesson.baseUrl}
                        segments={step.body}
                    />
                    {step.hints.slice(0, hintsShown).map((hint, i) => (
                        <p
                            key={i}
                            className={styles.hint}
                        >💡 <Runs runs={hint} /></p>
                    ))}
                    {hintsShown < step.hints.length && (
                        <button
                            className={styles.button}
                            type="button"
                            onClick={onHint}
                        >
                            <FormattedMessage
                                defaultMessage="Hint"
                                description="Show the next lesson hint"
                                id="gui.lessonPanel.hint"
                            />
                        </button>
                    )}
                </section>
                {graded && (
                    <div
                        className={classNames(styles.verdict, styles[check.status])}
                        data-check-status={check.status}
                    >
                        <div>{verdictText[check.status]}</div>
                        {check.messages.map((m, i) => (
                            <div
                                key={i}
                                className={styles.verdictMessage}
                            >{m}</div>
                        ))}
                    </div>
                )}
                <footer className={styles.footer}>
                    <IconButton
                        disabled={stepIndex === 0}
                        label={intl.formatMessage(messages.prev)}
                        path={ICON_PREV}
                        onClick={onPrev}
                    />
                    <span>{stepIndex + 1}/{total}</span>
                    <div className={styles.progressTrack}>
                        {lesson.steps.map((s, i) => (
                            <span
                                key={i}
                                className={classNames(styles.progressCell, {
                                    [styles.progressCurrent]: i === stepIndex,
                                    [styles.progressPassed]: passedSteps.includes(i)
                                })}
                            />
                        ))}
                    </div>
                    <IconButton
                        className={classNames({[styles.primary]: !graded || check.status === 'passed'})}
                        disabled={stepIndex === total - 1}
                        label={intl.formatMessage(messages.next)}
                        path={ICON_NEXT}
                        onClick={onNext}
                    />
                </footer>
            </div>
        </aside>
    );
};

const runsShape = PropTypes.arrayOf(PropTypes.shape({text: PropTypes.string.isRequired}));

LessonPanel.propTypes = {
    lesson: PropTypes.shape({
        name: PropTypes.string.isRequired,
        baseUrl: PropTypes.string.isRequired,
        steps: PropTypes.arrayOf(PropTypes.shape({
            title: PropTypes.string.isRequired,
            body: PropTypes.arrayOf(PropTypes.object).isRequired,
            hints: PropTypes.arrayOf(runsShape).isRequired,
            rules: PropTypes.arrayOf(PropTypes.object).isRequired
        })).isRequired
    }).isRequired,
    stepIndex: PropTypes.number.isRequired,
    passedSteps: PropTypes.arrayOf(PropTypes.number).isRequired,
    hintsShown: PropTypes.number.isRequired,
    check: PropTypes.shape({
        status: PropTypes.oneOf(Object.keys(verdictText)).isRequired,
        messages: PropTypes.arrayOf(PropTypes.string).isRequired
    }).isRequired,
    collapsed: PropTypes.bool.isRequired,
    onPrev: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    onHint: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onToggleCollapse: PropTypes.func.isRequired
};

export default LessonPanel;
