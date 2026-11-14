import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {connect} from 'react-redux';
import VM from '@thingblock/thingblock-vm';

import PlaygroundPanelComponent from '../components/playground-panel/playground-panel.jsx';
import {attachStream, listCameras, startCamera, stopCamera} from '../lib/vision/camera';
import {HAND_CONNECTIONS, POSE_CONNECTIONS, trackHands} from '../lib/vision/hand-tracker';
import {MOUSE, loadDeviceName, saveDeviceName} from '../lib/vision/camera-choice';
import {trackMouse} from '../lib/vision/mouse-hand';
import {drawPicture, objectImage} from '../lib/vision/object-images';
import {replayHands} from '../lib/vision/replay';

/** The event names shared with the VM's Camera AI extension (see thingblock-vm event-name.ts). */
const CAMERA_COMMAND = 'CAMERA_AI_CAMERA_COMMAND';
const CAMERA_STATUS = 'CAMERA_AI_CAMERA_STATUS';
const CAMERA_DEVICES = 'CAMERA_AI_CAMERA_DEVICES';
const VISION_RESULTS = 'CAMERA_AI_VISION_RESULTS';
const PLAYGROUND_UPDATE = 'CAMERA_AI_PLAYGROUND_UPDATE';
const PLAYGROUND_COMMAND = 'CAMERA_AI_PLAYGROUND_COMMAND';

/** The stage the VM reasons in: x −240…240, y −180…180. The canvas scales it to the panel. */
const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;

/** The emoji drawn for each object kind; the cricket and the robot Tre have pictures and use these while they load. */
const PICTURES = {
    ball: '🏀',
    cricket: '🦗',
    drop: '💧',
    basket: '🧺',
    star: '⭐',
    bomb: '💣',
    tre: '🤖'
};

/** A bamboo's stalks are this wide on the stage (the VM's playground uses the same width to judge touches). */
const BAMBOO_WIDTH = 46;

/**
 * Draw a bamboo: two green stalks, from the top and from the bottom of the stage, with the opening
 * between them at the object's y.
 * @param {CanvasRenderingContext2D} ctx The canvas.
 * @param {object} o The bamboo object, in stage units.
 * @param {number} width The canvas width in CSS pixels.
 * @param {number} height The canvas height in CSS pixels.
 */
const drawBamboo = (ctx, o, width, height) => {
    const scale = width / STAGE_WIDTH;
    const w = BAMBOO_WIDTH * scale;
    const cx = ((o.x / STAGE_WIDTH) + 0.5) * width;
    const gapTop = (0.5 - ((o.y + (o.size / 2)) / STAGE_HEIGHT)) * height;
    const gapBottom = (0.5 - ((o.y - (o.size / 2)) / STAGE_HEIGHT)) * height;
    const stalk = (top, bottom) => {
        if (bottom <= top) return;
        ctx.fillStyle = '#4d7c0f';
        ctx.fillRect(cx - (w / 2), top, w, bottom - top);
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(cx - (w / 2) + (w * 0.15), top, w * 0.3, bottom - top);
        // Nodes every 40 stage units, as on a real stalk.
        ctx.fillStyle = '#365314';
        for (let y = top + (20 * scale); y < bottom; y += 40 * scale) ctx.fillRect(cx - (w / 2), y, w, 3 * scale);
    };
    stalk(0, gapTop);
    stalk(gapBottom, height);
};

const EMPTY_PLAYGROUND = {objects: [], scores: [0, 0], timeLeft: null, say: '', showScoreboard: false};

/** The gesture names drawn under a hand, by the tracker's gesture value; same ids as the blocks' menu. */
const gestureMessages = defineMessages({
    fist: {id: 'cameraAi.menu.fist', defaultMessage: 'fist', description: 'Gesture name: a closed fist'},
    open: {id: 'cameraAi.menu.open', defaultMessage: 'open hand', description: 'Gesture name: an open palm'},
    thumb_up: {id: 'cameraAi.menu.thumbUp', defaultMessage: 'thumbs up', description: 'Gesture name: thumbs up'},
    thumb_down: {
        id: 'cameraAi.menu.thumbDown', defaultMessage: 'thumbs down', description: 'Gesture name: thumbs down'
    },
    victory: {id: 'cameraAi.menu.victory', defaultMessage: 'victory', description: 'Gesture name: the V sign'},
    point_up: {
        id: 'cameraAi.menu.pointUp', defaultMessage: 'pointing up', description: 'Gesture name: index finger up'
    },
    i_love_you: {id: 'cameraAi.menu.iLoveYou', defaultMessage: 'I love you', description: 'Gesture name: the ILY sign'}
});

/**
 * Hand frames to play instead of the camera, set by development tools and tests on
 * `window.thingblockCameraReplay`; never read in production builds.
 * @returns {Array<object>|null} The frames, or null to use the camera.
 */
const replayFrames = () => {
    if (process.env.NODE_ENV === 'production') return null;
    const frames = window.thingblockCameraReplay;
    return Array.isArray(frames) && frames.length > 0 ? frames : null;
};

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
 * @param {object} labels The text to draw for each gesture value.
 */
const draw = (canvas, results, mirror, playground, labels) => {
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
                ctx.fillText(labels[hand.gesture] || hand.gesture, px(wrist), py(wrist) + 6);
            }
        }
    }

    // The body: the upper skeleton and a ring around the head, in the extension's cyan.
    if (results && results.pose) {
        const pts = results.pose.landmarks;
        const px = p => (mirror ? 1 - p.x : p.x) * width;
        const py = p => p.y * height;
        const seen = p => !(p.visibility < 0.5);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.9)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (const [a, b] of POSE_CONNECTIONS) {
            if (!seen(pts[a]) || !seen(pts[b])) continue;
            ctx.moveTo(px(pts[a]), py(pts[a]));
            ctx.lineTo(px(pts[b]), py(pts[b]));
        }
        ctx.stroke();
        const nose = pts[0];
        if (seen(nose)) {
            const ears = Math.hypot(px(pts[7]) - px(pts[8]), py(pts[7]) - py(pts[8]));
            ctx.beginPath();
            ctx.arc(px(nose), py(nose), Math.max(12, ears * 0.75), 0, Math.PI * 2);
            ctx.stroke();
            // The line of the eyes shows the lean.
            ctx.beginPath();
            ctx.moveTo(px(pts[2]), py(pts[2]));
            ctx.lineTo(px(pts[5]), py(pts[5]));
            ctx.stroke();
        }
    }

    // Objects, as pictures sized in stage units.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const o of playground.objects) {
        if (o.kind === 'bamboo') {
            drawBamboo(ctx, o, width, height);
            continue;
        }
        const x = ((o.x / STAGE_WIDTH) + 0.5) * width;
        const y = (0.5 - (o.y / STAGE_HEIGHT)) * height;
        const img = objectImage(o.kind, assetBase());
        if (img) {
            drawPicture(ctx, img, o, x, y, o.size * scale);
            continue;
        }
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
    const intl = useIntl();
    const labels = useMemo(() => Object.fromEntries(
        Object.entries(gestureMessages).map(([gesture, message]) => [gesture, intl.formatMessage(message)])
    ), [intl]);
    const labelsRef = useRef(labels);
    labelsRef.current = labels;
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const stageRef = useRef(null);
    const streamRef = useRef(null);
    const trackerRef = useRef(null);
    const resultsRef = useRef(null);
    const playgroundRef = useRef(EMPTY_PLAYGROUND);
    const mirrorRef = useRef(true);
    // Whether the project uses the head and body blocks, so the body tracker should run.
    const poseWantedRef = useRef(false);
    const startingRef = useRef(false);
    // Bumped by every start and stop; a start whose number is stale was stopped while it waited.
    const runRef = useRef(0);
    const fpsRef = useRef({count: 0, since: performance.now()});

    const [status, setStatus] = useState('off');
    const [error, setError] = useState(null);
    const [mirror, setMirror] = useState(true);
    const [fps, setFps] = useState(0);
    const [playground, setPlayground] = useState(EMPTY_PLAYGROUND);
    const [cameras, setCameras] = useState([]);
    const [deviceName, setDeviceName] = useState(loadDeviceName);
    const deviceNameRef = useRef(deviceName);
    const camerasRef = useRef(cameras);

    // Names become known once a camera was allowed, and change when a phone connects or leaves.
    const refreshCameras = useCallback(async () => {
        const found = await listCameras();
        camerasRef.current = found;
        setCameras(found);
        vm.events.emit(CAMERA_DEVICES, found.map(c => c.name));
    }, [vm]);

    useEffect(() => {
        refreshCameras();
        const devices = navigator.mediaDevices;
        if (!devices || !devices.addEventListener) return;
        devices.addEventListener('devicechange', refreshCameras);
        return () => devices.removeEventListener('devicechange', refreshCameras);
    }, [refreshCameras]);

    const emitStatus = useCallback((on, ready, err) => {
        const payload = {on, ready};
        if (err) payload.error = err.message;
        vm.events.emit(CAMERA_STATUS, payload);
    }, [vm]);

    const stop = useCallback(() => {
        runRef.current += 1;
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
        runRef.current += 1;
        const run = runRef.current;
        const stale = () => run !== runRef.current;
        startingRef.current = true;
        setError(null);
        setStatus('starting');
        emitStatus(true, false);
        let stream = null;
        let tracker = null;
        const frames = replayFrames();
        const mouse = deviceNameRef.current === MOUSE;
        if (frames || mouse) {
            trackerRef.current = frames ?
                replayHands(frames, handleResults) :
                trackMouse(stageRef.current, handleResults, () => mirrorRef.current, () => poseWantedRef.current);
            startingRef.current = false;
            fpsRef.current = {count: 0, since: performance.now()};
            setStatus('ready');
            emitStatus(true, true);
            return;
        }
        try {
            const chosen = camerasRef.current.find(c => c.name === deviceNameRef.current);
            stream = await startCamera(chosen ? chosen.id : null);
            if (stale()) return;
            streamRef.current = stream;
            await attachStream(videoRef.current, stream);
            if (stale()) return;
            tracker = await trackHands(videoRef.current, handleResults, {
                base: assetBase(),
                wantPose: () => poseWantedRef.current
            });
            if (stale()) return;
            trackerRef.current = tracker;
            fpsRef.current = {count: 0, since: performance.now()};
            refreshCameras();
            setStatus('ready');
            emitStatus(true, true);
        } catch (err) {
            if (stale()) return;
            console.error('[cameraAi] camera failed:', err); // eslint-disable-line no-console
            stopCamera(stream);
            streamRef.current = null;
            setError({name: err.name, message: err.message});
            setStatus('error');
            emitStatus(false, false, err);
        } finally {
            if (stale()) {
                // Stopped while this start was waiting: release what it opened, which stop() never saw.
                if (tracker) tracker.stop();
                stopCamera(stream);
            } else {
                startingRef.current = false;
            }
        }
    }, [emitStatus, handleResults, refreshCameras]);

    const chooseCamera = useCallback(name => {
        deviceNameRef.current = name;
        setDeviceName(name);
        saveDeviceName(name);
        // A running camera switches now; an idle one uses the choice when it starts.
        if (trackerRef.current || startingRef.current) {
            stop();
            start();
        }
    }, [start, stop]);

    // Offered when no webcam answers: play with the mouse at once.
    const handleUseMouse = useCallback(() => {
        chooseCamera(MOUSE);
        start();
    }, [chooseCamera, start]);

    // Blocks drive the camera through the VM's event bus; the VM describes the playground the same way.
    useEffect(() => {
        const handleCommand = command => {
            if (typeof command.pose === 'boolean') poseWantedRef.current = command.pose;
            // A head block asking for the body tracker: a running camera picks it up on its next frame.
            if (command.pose && !('on' in command)) return;
            if (typeof command.device === 'string') {
                chooseCamera(command.device);
            } else if (command.on) {
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
    }, [vm, start, stop, chooseCamera]);

    // The camera stops with the panel.
    useEffect(() => () => stop(), [stop]);

    // Redraw every frame while mounted: the hands move with the camera, the objects with the program.
    useEffect(() => {
        let frame = 0;
        const tick = () => {
            if (canvasRef.current) {
                draw(canvasRef.current, resultsRef.current, mirrorRef.current, playgroundRef.current,
                    labelsRef.current);
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
            cameras={cameras}
            canvasRef={canvasRef}
            deviceName={deviceName}
            error={error}
            fps={fps}
            mirror={mirror}
            mouseName={MOUSE}
            playground={playground}
            status={status}
            videoRef={videoRef}
            onCameraOff={stop}
            onCameraOn={start}
            onChooseCamera={chooseCamera}
            stageRef={stageRef}
            onClear={handleClear}
            onToggleMirror={handleToggleMirror}
            onUseMouse={handleUseMouse}
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
