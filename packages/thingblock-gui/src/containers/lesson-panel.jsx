import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {connect} from 'react-redux';
import LessonPanelComponent from '../components/lesson-panel/lesson-panel.jsx';
import {decideCheck} from '../lib/lesson-check';
import {saveProgress} from '../lib/lesson-progress';
import {getSimClient} from '../lib/sim/sim-client';
import {closeLesson, goToStep, markStepPassed, setCheck, showNextHint} from '../reducers/lesson';

/**
 * The lesson column. Watches the shared simulator worker for this step's rule verdicts and turns
 * them into the verdict box; saves progress on every step change and pass.
 */
const LessonPanel = ({
    lesson, stepIndex, passedSteps, hintsShown, check, simCode, simDiagnostics, simLoadedCode,
    onCheck, onPassed, onStep, onHint, onClose
}) => {
    const [collapsed, setCollapsed] = useState(false);
    const reportRef = useRef(null);
    const snapshotRef = useRef(null);
    const step = lesson.steps[stepIndex];
    const graded = step.rules.length > 0;
    // The worker holds exactly the workspace's program: the Simulator panel loaded it after the last edit.
    const ranSinceEdit = simLoadedCode !== null && simLoadedCode === simCode;

    // Blockly sizes itself to its container only on window resize.
    useEffect(() => {
        window.dispatchEvent(new Event('resize'));
        return () => window.dispatchEvent(new Event('resize'));
    }, [collapsed]);

    useEffect(() => {
        saveProgress(lesson.ma, {stepIndex, passedSteps});
    }, [lesson.ma, stepIndex, passedSteps]);

    // Watch this step's rules; a step without rules watches nothing. The worker answers with a `check`
    // on the program it holds.
    useEffect(() => {
        reportRef.current = null;
        getSimClient().post({type: 'watch', rules: graded ? step.rules : null});
    }, [step, graded]);

    useEffect(() => () => getSimClient().post({type: 'watch', rules: null}), []);

    // An edit makes the verdict box ask for a new run, or name the blocks the simulator cannot run (Run
    // stays disabled while there are any); steps already passed stay passed.
    // Workspace events that change nothing (selecting, scrolling) still regenerate the code with a fresh
    // diagnostics array, so the effect keys on the messages rather than the array.
    const diagnosticsKey = JSON.stringify(simDiagnostics.map(d => d.message));
    useEffect(() => {
        reportRef.current = null;
        if (!graded) return;
        const messages = JSON.parse(diagnosticsKey);
        if (messages.length) onCheck('blocked', messages);
        else onCheck('idle');
    }, [simCode, diagnosticsKey, step, graded, onCheck]);

    useEffect(() => getSimClient().subscribe(message => {
        if (!graded) return;
        if (message.type === 'snapshot') snapshotRef.current = message.snapshot;
        else if (message.type === 'check') reportRef.current = message;
        else return;
        // A paused program from before the last edit keeps posting snapshots; it says nothing about
        // the workspace, so the verdict box keeps what the edit set.
        if (!ranSinceEdit) return;
        const verdict = decideCheck({
            report: reportRef.current,
            snapshot: snapshotRef.current,
            diagnostics: simDiagnostics,
            ranSinceEdit
        });
        if (verdict.status !== check.status || verdict.messages.join('\n') !== check.messages.join('\n')) {
            onCheck(verdict.status, verdict.messages);
        }
        if (verdict.status === 'passed' && !passedSteps.includes(stepIndex)) onPassed(stepIndex);
    }), [graded, ranSinceEdit, stepIndex, passedSteps, simDiagnostics, check, onCheck, onPassed]);

    const handleNext = useCallback(() => onStep(stepIndex + 1), [onStep, stepIndex]);
    const handlePrev = useCallback(() => onStep(stepIndex - 1), [onStep, stepIndex]);
    const handleToggleCollapse = useCallback(() => setCollapsed(c => !c), []);

    return (
        <LessonPanelComponent
            check={check}
            collapsed={collapsed}
            hintsShown={hintsShown}
            lesson={lesson}
            passedSteps={passedSteps}
            stepIndex={stepIndex}
            onClose={onClose}
            onHint={onHint}
            onNext={handleNext}
            onPrev={handlePrev}
            onToggleCollapse={handleToggleCollapse}
        />
    );
};

LessonPanel.propTypes = {
    lesson: PropTypes.shape({
        ma: PropTypes.string.isRequired,
        steps: PropTypes.arrayOf(PropTypes.shape({
            rules: PropTypes.arrayOf(PropTypes.object).isRequired
        })).isRequired
    }).isRequired,
    stepIndex: PropTypes.number.isRequired,
    passedSteps: PropTypes.arrayOf(PropTypes.number).isRequired,
    hintsShown: PropTypes.number.isRequired,
    check: PropTypes.shape({
        status: PropTypes.string.isRequired,
        messages: PropTypes.arrayOf(PropTypes.string).isRequired
    }).isRequired,
    simCode: PropTypes.string.isRequired,
    simDiagnostics: PropTypes.arrayOf(PropTypes.shape({message: PropTypes.string})).isRequired,
    simLoadedCode: PropTypes.string,
    onCheck: PropTypes.func.isRequired,
    onPassed: PropTypes.func.isRequired,
    onStep: PropTypes.func.isRequired,
    onHint: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    lesson: state.scratchGui.lesson.lesson,
    stepIndex: state.scratchGui.lesson.stepIndex,
    passedSteps: state.scratchGui.lesson.passedSteps,
    hintsShown: state.scratchGui.lesson.hintsShown,
    check: state.scratchGui.lesson.check,
    simCode: state.scratchGui.code.simCode,
    simDiagnostics: state.scratchGui.code.simDiagnostics,
    simLoadedCode: state.scratchGui.code.simLoadedCode
});

const mapDispatchToProps = dispatch => ({
    onCheck: (status, messages) => dispatch(setCheck(status, messages)),
    onPassed: i => dispatch(markStepPassed(i)),
    onStep: i => dispatch(goToStep(i)),
    onHint: () => dispatch(showNextHint()),
    onClose: () => dispatch(closeLesson())
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonPanel);
