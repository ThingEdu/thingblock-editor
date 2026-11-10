import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
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

const LessonPanel = ({
    lesson, stepIndex, passedSteps, hintsShown, check, collapsed,
    onPrev, onNext, onHint, onClose, onToggleCollapse
}) => {
    const step = lesson.steps[stepIndex];
    const total = lesson.steps.length;
    const graded = step.rules.length > 0;
    if (collapsed) {
        return (
            <aside className={classNames(styles.panel, styles.collapsed)}>
                <button
                    className={styles.collapseButton}
                    type="button"
                    onClick={onToggleCollapse}
                >▶</button>
                <span className={styles.collapsedLabel}>{stepIndex + 1}/{total}</span>
            </aside>
        );
    }
    return (
        <aside
            className={styles.panel}
            data-tour="huong-dan"
        >
            <header className={styles.header}>
                <button
                    className={styles.collapseButton}
                    type="button"
                    onClick={onToggleCollapse}
                >◀</button>
                <span className={styles.title}>{lesson.ten}</span>
                <button
                    className={styles.closeButton}
                    type="button"
                    onClick={onClose}
                >✕</button>
            </header>
            <div className={styles.progressRow}>
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
            </div>
            <section className={styles.content}>
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
                        className={styles.hintButton}
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
                <button
                    disabled={stepIndex === 0}
                    type="button"
                    onClick={onPrev}
                >
                    ◀ <FormattedMessage
                        defaultMessage="Back"
                        description="Previous lesson step"
                        id="gui.lessonPanel.prev"
                    />
                </button>
                <button
                    className={classNames({[styles.nextReady]: !graded || check.status === 'passed'})}
                    disabled={stepIndex === total - 1}
                    type="button"
                    onClick={onNext}
                >
                    <FormattedMessage
                        defaultMessage="Next"
                        description="Next lesson step"
                        id="gui.lessonPanel.next"
                    /> ▶
                </button>
            </footer>
        </aside>
    );
};

const runsShape = PropTypes.arrayOf(PropTypes.shape({text: PropTypes.string.isRequired}));

LessonPanel.propTypes = {
    lesson: PropTypes.shape({
        ten: PropTypes.string.isRequired,
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
