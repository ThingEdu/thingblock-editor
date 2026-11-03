import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {connect} from 'react-redux';

import SimPanelComponent from '../components/sim-panel/sim-panel.jsx';
import {flushGeneratedCode} from '../lib/code-flush';
import {getSimClient} from '../lib/sim/sim-client';
import {setSimHighlight, setSimLoadedCode} from '../reducers/code';

/** Serial text kept in the panel; older output scrolls away. */
const SERIAL_LIMIT = 4000;
/** Rig input of the distance sensor, in centimetres, and where its slider starts: nothing near. */
const DISTANCE_INPUT = 'ultrasonic';
const DEFAULT_DISTANCE_CM = 100;
/** Rig input of a gamepad button: 1 while held. */
const ps2Input = name => `ps2:${name}`;
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
const SimPanel = ({simCode, simDiagnostics, onHighlight, onLoaded}) => {
    const loadedRef = useRef(null);
    const [snapshot, setSnapshot] = useState(null);
    const [serial, setSerial] = useState('');
    const [speed, setSpeed] = useState(1);
    const [switchPressed, setSwitchPressed] = useState(false);
    const [distance, setDistance] = useState(DEFAULT_DISTANCE_CM);
    const [ps2Held, setPs2Held] = useState({});
    const [workerError, setWorkerError] = useState(null);

    // The simulator worker is shared with other panels and outlives this one, so on unmount the panel
    // stops its session instead of terminating the worker.
    useEffect(() => {
        const client = getSimClient();
        const unsubscribe = client.subscribe(data => {
            if (data.type === 'error') {
                setWorkerError(data.message);
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
        setSerial('');
        post({type: 'load', code});
        onLoaded(code);
        post({type: 'speed', speed});
        post({type: 'input', key: 'gpio3', value: switchPressed ? 0 : 1});
        post({type: 'input', key: DISTANCE_INPUT, value: distance});
        for (const [name, held] of Object.entries(ps2Held)) {
            if (held) post({type: 'input', key: ps2Input(name), value: 1});
        }
        loadedRef.current = code;
        setStale(false);
    }, [post, speed, switchPressed, distance, ps2Held, onLoaded]);

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

    const handlePs2Change = useCallback((name, held) => {
        setPs2Held(current => ({...current, [name]: held}));
        post({type: 'input', key: ps2Input(name), value: held ? 1 : 0});
    }, [post]);

    const problems = workerError ? [...simDiagnostics, {message: workerError}] : simDiagnostics;

    return (
        <SimPanelComponent
            distance={distance}
            problems={problems}
            ps2Held={ps2Held}
            serial={serial}
            snapshot={snapshot}
            stale={stale}
            speed={speed}
            usesOled={OLED_CONSTRUCTOR.test(simCode)}
            switchPressed={switchPressed}
            onDistanceChange={handleDistanceChange}
            onPause={handlePause}
            onPs2Change={handlePs2Change}
            onReset={handleReset}
            onRun={handleRun}
            onSpeedChange={handleSpeedChange}
            onStep={handleStep}
            onSwitchChange={handleSwitchChange}
        />
    );
};

SimPanel.propTypes = {
    simCode: PropTypes.string.isRequired,
    simDiagnostics: PropTypes.arrayOf(PropTypes.shape({message: PropTypes.string})).isRequired,
    onHighlight: PropTypes.func.isRequired,
    onLoaded: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    simCode: state.scratchGui.code.simCode,
    simDiagnostics: state.scratchGui.code.simDiagnostics
});

const mapDispatchToProps = dispatch => ({
    onHighlight: blockId => dispatch(setSimHighlight(blockId)),
    onLoaded: code => dispatch(setSimLoadedCode(code))
});

export default connect(mapStateToProps, mapDispatchToProps)(SimPanel);
