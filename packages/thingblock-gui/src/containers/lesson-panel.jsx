import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {connect} from 'react-redux';
import LessonPanelComponent from '../components/lesson-panel/lesson-panel.jsx';
import {decideCameraCheck, gradeCameraStep, isCameraStep} from '../lib/lesson-camera';
import {decideCheck} from '../lib/lesson-check';
import {saveProgress} from '../lib/lesson-progress';
import {getSimClient} from '../lib/sim/sim-client';
import {closeLesson, goToStep, markStepPassed, setCheck, showNextHint} from '../reducers/lesson';

/** The VM events the Camera AI extension and the playground panel exchange (see thingblock-vm event-name.ts). */
const CAMERA_STATUS = 'CAMERA_AI_CAMERA_STATUS';
const VISION_RESULTS = 'CAMERA_AI_VISION_RESULTS';
const PLAYGROUND_UPDATE = 'CAMERA_AI_PLAYGROUND_UPDATE';
const PROJECT_RUN_START = 'PROJECT_RUN_START';
/** How often a Camera AI step is graded; the playground changes with every hand frame. */
const CAMERA_GRADE_MS = 200;

/**
 * The lesson column. Watches the shared simulator worker for this step's rule verdicts and turns
 * them into the verdict box; saves progress on every step change and pass. A Camera AI step is graded
 * here instead, on what the playground shows.
 */
const LessonPanel = ({
    lesson, stepIndex, passedSteps, hintsShown, check, simCode, simDiagnostics, simLoadedCode, vm,
    onCheck, onPassed, onStep, onHint, onClose
}) => {
    const [collapsed, setCollapsed] = useState(false);
    const reportRef = useRef(null);
    const snapshotRef = useRef(null);
    const step = lesson.steps[stepIndex];
    const cameraStep = isCameraStep(step);
    // Graded by the simulator worker; a Camera AI step is graded on the playground below.
    const graded = step.rules.length > 0 && !cameraStep;
    // The latest Camera AI events, kept from the moment the lesson opens so a step sees what is on screen.
    const cameraSeenRef = useRef({
        cameraOn: false,
        vision: null,
        playground: {objects: [], scores: [0, 0], say: ''},
        ranAt: null
    });
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

    useEffect(() => {
        if (!vm) return;
        const seen = cameraSeenRef.current;
        const onStatus = status => {
            seen.cameraOn = Boolean(status.on);
        };
        const onVision = results => {
            seen.vision = results;
        };
        const onPlayground = state => {
            seen.playground = state;
        };
        const onRun = () => {
            seen.ranAt = Date.now();
        };
        vm.events.on(CAMERA_STATUS, onStatus);
        vm.events.on(VISION_RESULTS, onVision);
        vm.events.on(PLAYGROUND_UPDATE, onPlayground);
        vm.events.on(PROJECT_RUN_START, onRun);
        return () => {
            vm.events.off(CAMERA_STATUS, onStatus);
            vm.events.off(VISION_RESULTS, onVision);
            vm.events.off(PLAYGROUND_UPDATE, onPlayground);
            vm.events.off(PROJECT_RUN_START, onRun);
        };
    }, [vm]);

    // A Camera AI step: grade the playground a few times a second until the step changes.
    const checkRef = useRef(check);
    checkRef.current = check;
    const passedRef = useRef(passedSteps);
    passedRef.current = passedSteps;
    useEffect(() => {
        if (!cameraStep) return;
        const stepAt = Date.now();
        const grade = () => {
            const seen = cameraSeenRef.current;
            const now = Date.now();
            const verdict = decideCameraCheck({
                results: gradeCameraStep(step, seen, now),
                ranAt: seen.ranAt,
                stepAt,
                now
            });
            const shown = checkRef.current;
            if (verdict.status !== shown.status || verdict.messages.join('\n') !== shown.messages.join('\n')) {
                onCheck(verdict.status, verdict.messages);
            }
            if (verdict.status === 'passed' && !passedRef.current.includes(stepIndex)) onPassed(stepIndex);
        };
        grade();
        const timer = setInterval(grade, CAMERA_GRADE_MS);
        return () => clearInterval(timer);
    }, [cameraStep, step, stepIndex, onCheck, onPassed]);

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
    vm: PropTypes.shape({
        events: PropTypes.shape({on: PropTypes.func, off: PropTypes.func})
    }),
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
    simLoadedCode: state.scratchGui.code.simLoadedCode,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onCheck: (status, messages) => dispatch(setCheck(status, messages)),
    onPassed: i => dispatch(markStepPassed(i)),
    onStep: i => dispatch(goToStep(i)),
    onHint: () => dispatch(showNextHint()),
    onClose: () => dispatch(closeLesson())
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonPanel);
