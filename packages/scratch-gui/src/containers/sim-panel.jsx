import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {connect} from 'react-redux';

import SimPanelComponent from '../components/sim-panel/sim-panel.jsx';
import {getSimClient} from '../lib/sim/sim-client';
import {setSimHighlight} from '../reducers/code';

/** Serial text kept in the panel; older output scrolls away. */
const SERIAL_LIMIT = 4000;

/**
 * Runs the generated simulator program in a Web Worker and shows the virtual ThingBot. The program is
 * (re)loaded from the latest generated code whenever the learner presses Run or Step after changing
 * blocks, so the simulator always runs what the workspace shows.
 * @param {object} props Component props.
 * @param {string} props.simCode The workspace compiled for the simulator.
 * @param {Array<{message: string}>} props.simDiagnostics Problems that keep the program from running.
 * @param {Function} props.onHighlight Called with the block id to highlight, or null to clear it.
 * @returns {React.ReactElement} The simulator panel.
 */
const SimPanel = ({simCode, simDiagnostics, onHighlight}) => {
    const loadedRef = useRef(null);
    const [snapshot, setSnapshot] = useState(null);
    const [serial, setSerial] = useState('');
    const [speed, setSpeed] = useState(1);
    const [switchPressed, setSwitchPressed] = useState(false);
    const [workerError, setWorkerError] = useState(null);

    useEffect(() => getSimClient().subscribe(data => {
        if (data.type === 'error') {
            setWorkerError(data.message);
            return;
        }
        if (data.type !== 'snapshot') return;
        setSnapshot(data.snapshot);
        if (data.snapshot.serial) setSerial(s => (s + data.snapshot.serial).slice(-SERIAL_LIMIT));
    }), []);

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

    const load = useCallback(() => {
        setWorkerError(null);
        setSerial('');
        post({type: 'load', code: simCode});
        post({type: 'speed', speed});
        post({type: 'input', key: 'gpio3', value: switchPressed ? 0 : 1});
        loadedRef.current = simCode;
        setStale(false);
    }, [post, simCode, speed, switchPressed]);

    const handleRun = useCallback(() => {
        if (loadedRef.current !== simCode || (snapshot && snapshot.phase === 'halted')) load();
        post({type: 'run'});
    }, [load, post, simCode, snapshot]);

    const handleStep = useCallback(() => {
        if (loadedRef.current !== simCode) load();
        post({type: 'step'});
    }, [load, post, simCode]);

    const handlePause = useCallback(() => post({type: 'pause'}), [post]);

    const handleReset = useCallback(() => {
        const wasRunning = snapshot && snapshot.running;
        load();
        if (wasRunning) post({type: 'run'});
    }, [load, post, snapshot]);

    const handleSpeedChange = useCallback(value => {
        setSpeed(value);
        post({type: 'speed', speed: value});
    }, [post]);

    // The ThingBot switch is active low: pressed pulls GPIO 3 to 0.
    const handleSwitchChange = useCallback(pressed => {
        setSwitchPressed(pressed);
        post({type: 'input', key: 'gpio3', value: pressed ? 0 : 1});
    }, [post]);

    const problems = workerError ? [...simDiagnostics, {message: workerError}] : simDiagnostics;

    return (
        <SimPanelComponent
            problems={problems}
            serial={serial}
            snapshot={snapshot}
            stale={stale}
            speed={speed}
            switchPressed={switchPressed}
            onPause={handlePause}
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
    onHighlight: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    simCode: state.scratchGui.code.simCode,
    simDiagnostics: state.scratchGui.code.simDiagnostics
});

const mapDispatchToProps = dispatch => ({
    onHighlight: blockId => dispatch(setSimHighlight(blockId))
});

export default connect(mapStateToProps, mapDispatchToProps)(SimPanel);
