import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {connect} from 'react-redux';

import {ballById} from '../components/sim-panel/balls.js';
import SimPanelComponent from '../components/sim-panel/sim-panel.jsx';
import SimUnavailable from '../components/sim-panel/sim-unavailable.jsx';
import {flushGeneratedCode} from '../lib/code-flush';
import {getSimClient} from '../lib/sim/sim-client';
import {BuzzerAudio, buzzerPitch} from '../lib/sim/buzzer-audio';
import {setSimHighlight, setSimLoadedCode} from '../reducers/code';

/** Serial text kept in the panel; older output scrolls away. */
const SERIAL_LIMIT = 4000;
/** Rig input of the distance sensor, in centimetres, and where its slider starts: nothing near. */
const DISTANCE_INPUT = 'ultrasonic';
const DEFAULT_DISTANCE_CM = 100;
/**
 * The IR eye on IO4: the rig drives the reading of the ball in front of it onto `adc4`, or puts the egg
 * belt there (`belt` 1), which then feeds the eye itself. Readings as thingblock-sim `hal/rig.ts`.
 */
const IR_INPUT = 'adc4';
const BELT_INPUT = 'belt';
const DEFAULT_BALL = 'white';
const ballReading = id => ballById(id).ir;
/** The simulator code reads IO4 when the program uses the IR eye there. */
const IR_READ = /\$\.analogRead\(4\)/;
/** Lesson rules that grade the egg belt, so a lesson using them opens with the belt in place. */
const BELT_RULES = new Set(['sorted', 'rejected']);
/** Rig input of a gamepad button: 1 while held. */
const ps2Input = name => `ps2:${name}`;
/** Where the panel remembers that the learner muted the buzzer. */
const MUTED_KEY = 'thingblock.sim.muted';
const readMuted = () => {
    try {
        return window.localStorage.getItem(MUTED_KEY) === '1';
    } catch (e) {
        return false;
    }
};
const writeMuted = muted => {
    try {
        window.localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
    } catch (e) {
        // storage blocked: the choice lasts this session only
    }
};
/** The simulator code builds a display with this constructor when the program uses the OLED. */
const OLED_CONSTRUCTOR = /\bAdafruit_SSD1306\b/;

/**
 * Runs the generated simulator program in a Web Worker and shows the virtual ThingBot. The program is
 * (re)loaded from the latest generated code whenever the learner presses Run or Step after changing
 * blocks, so the simulator always runs what the workspace shows.
 * @param {object} props Component props.
 * @param {string} props.simCode The workspace compiled for the simulator.
 * @param {Array<{message: string}>} props.simDiagnostics Problems that keep the program from running.
 * @param {Function} props.onHighlight Called with the block id to highlight, or null to clear it.
 * @param {Function} props.onLoaded Called with the code loaded into the worker, or null once it is stopped.
 * @returns {React.ReactElement} The simulator panel.
 */
const SimPanel = ({beltLesson, roomy, simCode, simDiagnostics, onHighlight, onLoaded}) => {
    const loadedRef = useRef(null);
    const [snapshot, setSnapshot] = useState(null);
    const [serial, setSerial] = useState('');
    const [speed, setSpeed] = useState(1);
    const [switchPressed, setSwitchPressed] = useState(false);
    const [distance, setDistance] = useState(DEFAULT_DISTANCE_CM);
    const [ps2Held, setPs2Held] = useState({});
    const [ball, setBall] = useState(DEFAULT_BALL);
    const [belt, setBelt] = useState(Boolean(beltLesson));
    const [workerError, setWorkerError] = useState(null);
    // The worker stopped answering and was replaced: the program has to be loaded again.
    const [restarted, setRestarted] = useState(false);
    const [muted, setMuted] = useState(readMuted);
    const audioRef = useRef(null);
    if (!audioRef.current) audioRef.current = new BuzzerAudio();

    // The buzzer sounds while the program runs at normal speed; pausing, resetting or speeding up
    // silences it, and so does closing the panel.
    useEffect(() => {
        audioRef.current.setMuted(muted);
        audioRef.current.play(speed === 1 ? buzzerPitch(snapshot) : 0);
    }, [snapshot, speed, muted]);
    useEffect(() => () => audioRef.current.close(), []);

    const handleToggleMute = useCallback(() => {
        setMuted(m => {
            writeMuted(!m);
            return !m;
        });
    }, []);

    // The simulator worker is shared with other panels and outlives this one, so on unmount the panel
    // stops its session instead of terminating the worker.
    useEffect(() => {
        const client = getSimClient();
        const unsubscribe = client.subscribe(data => {
            if (data.type === 'error') {
                setWorkerError(data.message);
                return;
            }
            if (data.type === 'hung') {
                loadedRef.current = null;
                setSnapshot(null);
                setRestarted(true);
                return;
            }
            if (data.type !== 'snapshot') return;
            setSnapshot(data.snapshot);
            if (data.snapshot.serial) setSerial(s => (s + data.snapshot.serial).slice(-SERIAL_LIMIT));
        });
        return () => {
            unsubscribe();
            client.post({type: 'stop'});
            onLoaded(null);
        };
    }, [onLoaded]);

    // Highlight where the program stopped; clear it while running freely.
    const stoppedOn = snapshot && !snapshot.running ? snapshot.block || null : null;
    useEffect(() => {
        onHighlight(stoppedOn);
    }, [stoppedOn, onHighlight]);
    useEffect(() => () => onHighlight(null), [onHighlight]);

    const post = useCallback(message => getSimClient().post(message), []);

    // The blocks changed under a loaded program (an edit, or a project whose peripherals finished
    // loading after it appeared): stop running the old program rather than show it as the new one.
    // The next Run or Step loads the current code.
    const [stale, setStale] = useState(false);
    useEffect(() => {
        if (loadedRef.current === null || loadedRef.current === simCode) return;
        post({type: 'pause'});
        setStale(true);
    }, [post, simCode]);

    // The code the workspace shows right now: an edit within the code view's debounce has not reached
    // simCode yet, so regenerate before loading rather than run the program from before the edit.
    const currentCode = useCallback(() => {
        const fresh = flushGeneratedCode();
        return fresh ? fresh.simCode : simCode;
    }, [simCode]);

    const load = useCallback(code => {
        setWorkerError(null);
        setRestarted(false);
        setSerial('');
        post({type: 'load', code});
        onLoaded(code);
        post({type: 'speed', speed});
        post({type: 'input', key: 'gpio3', value: switchPressed ? 0 : 1});
        post({type: 'input', key: DISTANCE_INPUT, value: distance});
        for (const [name, held] of Object.entries(ps2Held)) {
            if (held) post({type: 'input', key: ps2Input(name), value: 1});
        }
        if (belt) post({type: 'input', key: BELT_INPUT, value: 1});
        else if (IR_READ.test(code)) post({type: 'input', key: IR_INPUT, value: ballReading(ball)});
        loadedRef.current = code;
        setStale(false);
    }, [post, speed, switchPressed, distance, ps2Held, ball, belt, onLoaded]);

    const handleRun = useCallback(() => {
        const code = currentCode();
        if (loadedRef.current !== code || (snapshot && snapshot.phase === 'halted')) load(code);
        post({type: 'run'});
    }, [currentCode, load, post, snapshot]);

    const handleStep = useCallback(() => {
        const code = currentCode();
        if (loadedRef.current !== code) load(code);
        post({type: 'step'});
    }, [currentCode, load, post]);

    const handlePause = useCallback(() => post({type: 'pause'}), [post]);

    const handleReset = useCallback(() => {
        const wasRunning = snapshot && snapshot.running;
        load(currentCode());
        if (wasRunning) post({type: 'run'});
    }, [currentCode, load, post, snapshot]);

    const handleSpeedChange = useCallback(value => {
        setSpeed(value);
        post({type: 'speed', speed: value});
    }, [post]);

    // The ThingBot switch is active low: pressed pulls GPIO 3 to 0.
    const handleSwitchChange = useCallback(pressed => {
        setSwitchPressed(pressed);
        post({type: 'input', key: 'gpio3', value: pressed ? 0 : 1});
    }, [post]);

    const handleDistanceChange = useCallback(cm => {
        setDistance(cm);
        post({type: 'input', key: DISTANCE_INPUT, value: cm});
    }, [post]);

    const handleBallChange = useCallback(id => {
        setBall(id);
        post({type: 'input', key: IR_INPUT, value: ballReading(id)});
    }, [post]);

    // Taking the belt away puts the chosen ball back in front of the eye.
    const handleBeltChange = useCallback(on => {
        setBelt(on);
        post({type: 'input', key: BELT_INPUT, value: on ? 1 : 0});
        if (!on) post({type: 'input', key: IR_INPUT, value: ballReading(ball)});
    }, [post, ball]);

    // A lesson graded on the egg belt opens with the belt in front of the eye; leaving it takes it away.
    // The first render already starts that way, so only a change of lesson moves the belt.
    const beltLessonRef = useRef(Boolean(beltLesson));
    useEffect(() => {
        if (beltLessonRef.current === Boolean(beltLesson)) return;
        beltLessonRef.current = Boolean(beltLesson);
        handleBeltChange(Boolean(beltLesson));
    }, [beltLesson, handleBeltChange]);

    const handlePs2Change = useCallback((name, held) => {
        setPs2Held(current => ({...current, [name]: held}));
        post({type: 'input', key: ps2Input(name), value: held ? 1 : 0});
    }, [post]);

    return (
        <SimPanelComponent
            ball={ball}
            belt={belt}
            distance={distance}
            muted={muted}
            problems={simDiagnostics}
            restarted={restarted}
            runError={workerError}
            ps2Held={ps2Held}
            serial={serial}
            snapshot={snapshot}
            stale={stale}
            speed={speed}
            roomy={roomy}
            usesIr={IR_READ.test(simCode)}
            usesOled={OLED_CONSTRUCTOR.test(simCode)}
            switchPressed={switchPressed}
            onBallChange={handleBallChange}
            onBeltChange={handleBeltChange}
            onDistanceChange={handleDistanceChange}
            onPause={handlePause}
            onPs2Change={handlePs2Change}
            onReset={handleReset}
            onRun={handleRun}
            onSpeedChange={handleSpeedChange}
            onStep={handleStep}
            onSwitchChange={handleSwitchChange}
            onToggleMute={handleToggleMute}
        />
    );
};

SimPanel.propTypes = {
    beltLesson: PropTypes.bool,
    roomy: PropTypes.bool,
    simCode: PropTypes.string.isRequired,
    simDiagnostics: PropTypes.arrayOf(PropTypes.shape({message: PropTypes.string})).isRequired,
    onHighlight: PropTypes.func.isRequired,
    onLoaded: PropTypes.func.isRequired
};

/**
 * The simulator panel for the selected board, or a note that the board has no simulator.
 * @param {object} props Component props.
 * @param {string|null} props.unsimulatedDevice The selected board's name when it cannot be simulated.
 * @returns {React.ReactElement} The panel.
 */
const SimPanelOrNote = ({unsimulatedDevice, ...props}) => (
    unsimulatedDevice ? <SimUnavailable device={unsimulatedDevice} /> : <SimPanel {...props} />
);

SimPanelOrNote.propTypes = {
    unsimulatedDevice: PropTypes.string
};

/**
 * The selected board's name when the simulator does not model it, else null.
 * @param {object} state The GUI state.
 * @returns {string|null} The board's name.
 */
const unsimulatedDevice = state => {
    const {vm, board} = state.scratchGui;
    const deviceId = board && board.selectedDeviceId;
    if (!vm || !deviceId || vm.devices.hasSimulator(deviceId)) return null;
    const device = vm.devices.getDeviceList({includeHidden: true}).find(d => d.deviceId === deviceId);
    return device ? device.name : deviceId;
};

const usesBelt = lesson => Boolean(lesson) &&
    lesson.steps.some(step => step.rules.some(rule => BELT_RULES.has(rule.kind)));

const mapStateToProps = state => ({
    beltLesson: usesBelt(state.scratchGui.lesson && state.scratchGui.lesson.lesson),
    simCode: state.scratchGui.code.simCode,
    simDiagnostics: state.scratchGui.code.simDiagnostics,
    unsimulatedDevice: unsimulatedDevice(state)
});

const mapDispatchToProps = dispatch => ({
    onHighlight: blockId => dispatch(setSimHighlight(blockId)),
    onLoaded: code => dispatch(setSimLoadedCode(code))
});

export default connect(mapStateToProps, mapDispatchToProps)(SimPanelOrNote);
