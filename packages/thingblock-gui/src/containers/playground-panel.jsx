import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {connect} from 'react-redux';
import VM from '@thingblock/thingblock-vm';

import PlaygroundPanelComponent from '../components/playground-panel/playground-panel.jsx';
import {attachStream, startCamera, stopCamera} from '../lib/vision/camera';
import {HAND_CONNECTIONS, trackHands} from '../lib/vision/hand-tracker';

/** The event names shared with the VM's Camera AI extension (see thingblock-vm event-name.ts). */
const CAMERA_COMMAND = 'CAMERA_AI_CAMERA_COMMAND';
const CAMERA_STATUS = 'CAMERA_AI_CAMERA_STATUS';
const VISION_RESULTS = 'CAMERA_AI_VISION_RESULTS';
const PLAYGROUND_UPDATE = 'CAMERA_AI_PLAYGROUND_UPDATE';
const PLAYGROUND_COMMAND = 'CAMERA_AI_PLAYGROUND_COMMAND';

/** The stage the VM reasons in: x −240…240, y −180…180. The canvas scales it to the panel. */
const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;

/** The picture drawn for each object kind. */
const PICTURES = {
    ball: '🏀',
    cricket: '🦗',
    drop: '💧',
    basket: '🧺',
    star: '⭐',
    bomb: '💣'
};

const EMPTY_PLAYGROUND = {objects: [], scores: [0, 0], timeLeft: null, say: '', showScoreboard: false};

/** Where the model's assets are served from; the desktop app loads the page from a file, so relative. */
const assetBase = () => {
    const base = document.querySelector('base');
    return base && base.href ? base.href : '';
};

/**
 * Draw the tracked hands and the playground objects over the camera picture.
 * @param {HTMLCanvasElement} canvas The overlay.
 * @param {object|null} results The latest `{hands}` from the tracker.
 * @param {boolean} mirror Whether the picture is mirrored.
 * @param {object} playground The objects to draw.
 */
const draw = (canvas, results, mirror, playground) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const scale = width / STAGE_WIDTH;

    // Hands: the skeleton in the extension's purple, the index tip ringed since most blocks use it.
    if (results) {
        const px = p => (mirror ? 1 - p.x : p.x) * width;
        const py = p => p.y * height;
        for (const hand of results.hands) {
            const pts = hand.landmarks;
            ctx.strokeStyle = 'rgba(167, 139, 250, 0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (const [a, b] of HAND_CONNECTIONS) {
                ctx.moveTo(px(pts[a]), py(pts[a]));
                ctx.lineTo(px(pts[b]), py(pts[b]));
            }
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            for (const p of pts) {
                ctx.beginPath();
                ctx.arc(px(p), py(p), 3, 0, Math.PI * 2);
                ctx.fill();
            }
            const tip = pts[8];
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(px(tip), py(tip), 10, 0, Math.PI * 2);
            ctx.stroke();
            if (hand.gesture !== 'none') {
                const wrist = pts[0];
                ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
                ctx.fillStyle = '#facc15';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(hand.gesture, px(wrist), py(wrist) + 6);
            }
        }
    }

    // Objects, as pictures sized in stage units.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const o of playground.objects) {
        const x = ((o.x / STAGE_WIDTH) + 0.5) * width;
        const y = (0.5 - (o.y / STAGE_HEIGHT)) * height;
        ctx.font = `${Math.round(o.size * scale)}px serif`;
        ctx.fillText(PICTURES[o.kind] || PICTURES.ball, x, y);
    }
};

/**
 * Runs the webcam and the hand tracker for the Camera AI extension, forwards every frame's hands
 * to the VM, and shows the playground the VM describes.
 * @param {object} props Component props.
 * @param {VM} props.vm The virtual machine, whose event bus the extension shares.
 * @returns {React.ReactElement} The panel.
 */
const PlaygroundPanel = ({vm}) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const trackerRef = useRef(null);
    const resultsRef = useRef(null);
    const playgroundRef = useRef(EMPTY_PLAYGROUND);
    const mirrorRef = useRef(true);
    const startingRef = useRef(false);
    const fpsRef = useRef({count: 0, since: performance.now()});

    const [status, setStatus] = useState('off');
    const [error, setError] = useState(null);
    const [mirror, setMirror] = useState(true);
    const [fps, setFps] = useState(0);
    const [playground, setPlayground] = useState(EMPTY_PLAYGROUND);

    const emitStatus = useCallback((on, ready, err) => {
        const payload = {on, ready};
        if (err) payload.error = err.message;
        vm.events.emit(CAMERA_STATUS, payload);
    }, [vm]);

    const stop = useCallback(() => {
        if (trackerRef.current) {
            trackerRef.current.stop();
            trackerRef.current = null;
        }
        stopCamera(streamRef.current);
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        resultsRef.current = null;
        startingRef.current = false;
        setStatus('off');
        setFps(0);
        emitStatus(false, false);
    }, [emitStatus]);

    const handleResults = useCallback(results => {
        resultsRef.current = results;
        vm.events.emit(VISION_RESULTS, {...results, mirror: mirrorRef.current});
        const f = fpsRef.current;
        f.count += 1;
        const now = performance.now();
        if (now - f.since >= 1000) {
            setFps(Math.round((f.count * 1000) / (now - f.since)));
            f.count = 0;
            f.since = now;
        }
    }, [vm]);

    const start = useCallback(async () => {
        if (startingRef.current || trackerRef.current) return;
        startingRef.current = true;
        setError(null);
        setStatus('starting');
        emitStatus(true, false);
        try {
            const stream = await startCamera();
            streamRef.current = stream;
            await attachStream(videoRef.current, stream);
            const tracker = await trackHands(videoRef.current, handleResults, {base: assetBase()});
            if (!startingRef.current) {
                // Stopped while loading.
                tracker.stop();
                return;
            }
            trackerRef.current = tracker;
            fpsRef.current = {count: 0, since: performance.now()};
            setStatus('ready');
            emitStatus(true, true);
        } catch (err) {
            console.error('[cameraAi] camera failed:', err); // eslint-disable-line no-console
            stopCamera(streamRef.current);
            streamRef.current = null;
            setError({name: err.name, message: err.message});
            setStatus('error');
            emitStatus(false, false, err);
        } finally {
            startingRef.current = false;
        }
    }, [emitStatus, handleResults]);

    // Blocks drive the camera through the VM's event bus; the VM describes the playground the same way.
    useEffect(() => {
        const handleCommand = command => {
            if (command.on) {
                if (typeof command.mirror === 'boolean') {
                    mirrorRef.current = command.mirror;
                    setMirror(command.mirror);
                }
                start();
            } else {
                stop();
            }
        };
        const handlePlayground = state => {
            playgroundRef.current = state;
            setPlayground(state);
        };
        vm.events.on(CAMERA_COMMAND, handleCommand);
        vm.events.on(PLAYGROUND_UPDATE, handlePlayground);
        return () => {
            vm.events.off(CAMERA_COMMAND, handleCommand);
            vm.events.off(PLAYGROUND_UPDATE, handlePlayground);
        };
    }, [vm, start, stop]);

    // The camera stops with the panel.
    useEffect(() => () => stop(), [stop]);

    // Redraw every frame while mounted: the hands move with the camera, the objects with the program.
    useEffect(() => {
        let frame = 0;
        const tick = () => {
            if (canvasRef.current) {
                draw(canvasRef.current, resultsRef.current, mirrorRef.current, playgroundRef.current);
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    const handleToggleMirror = useCallback(() => {
        mirrorRef.current = !mirrorRef.current;
        setMirror(mirrorRef.current);
    }, []);

    const handleClear = useCallback(() => {
        vm.events.emit(PLAYGROUND_COMMAND, {type: 'reset'});
    }, [vm]);

    return (
        <PlaygroundPanelComponent
            canvasRef={canvasRef}
            error={error}
            fps={fps}
            mirror={mirror}
            playground={playground}
            status={status}
            videoRef={videoRef}
            onCameraOff={stop}
            onCameraOn={start}
            onClear={handleClear}
            onToggleMirror={handleToggleMirror}
        />
    );
};

PlaygroundPanel.propTypes = {
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

export default connect(mapStateToProps)(PlaygroundPanel);
