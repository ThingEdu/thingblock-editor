/**
 * Hands and gestures from a video element, through MediaPipe's gesture recognizer. The model and
 * its WASM runtime are served from the editor's own static files, so this works offline.
 */

import {FilesetResolver, GestureRecognizer} from '@mediapipe/tasks-vision';

/** Where webpack copies the MediaPipe runtime (see webpack.config.js) and where the model lives. */
const WASM_PATH = 'static/mediapipe/wasm';
const MODEL_PATH = 'static/ai-models/gesture_recognizer.task';

/** MediaPipe's category names, as the VM's vision state expects them. */
const GESTURE_BY_CATEGORY = {
    None: 'none',
    Closed_Fist: 'fist',
    Open_Palm: 'open',
    Thumb_Up: 'thumb_up',
    Thumb_Down: 'thumb_down',
    Victory: 'victory',
    Pointing_Up: 'point_up',
    ILoveYou: 'i_love_you'
};

/** Landmark pairs that outline a hand, in MediaPipe's 21-point order. */
export const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
];

let recognizerPromise = null;

/**
 * Load the recognizer once; later calls share it.
 * @param {string} base Prefix of the static paths, '' in the dev server.
 * @returns {Promise<GestureRecognizer>} The model, ready for video.
 */
const loadRecognizer = base => {
    if (!recognizerPromise) {
        recognizerPromise = (async () => {
            const vision = await FilesetResolver.forVisionTasks(base + WASM_PATH);
            const create = delegate => GestureRecognizer.createFromOptions(vision, {
                baseOptions: {modelAssetPath: base + MODEL_PATH, delegate},
                runningMode: 'VIDEO',
                numHands: 2
            });
            // The GPU path needs WebGL 2; a machine or WebView without it still gets the CPU path.
            try {
                return await create('GPU');
            } catch (err) {
                console.warn('[cameraAi] GPU delegate unavailable, using CPU:', err); // eslint-disable-line no-console
                return create('CPU');
            }
        })().catch(err => {
            recognizerPromise = null;
            throw err;
        });
    }
    return recognizerPromise;
};

/**
 * Turn one recognizer result into the shape the VM takes.
 * @param {object} result A `GestureRecognizerResult`.
 * @returns {Array<object>} One entry per hand.
 */
const toHands = result => result.landmarks.map((landmarks, i) => {
    const gesture = (result.gestures[i] && result.gestures[i][0]) || null;
    const handedness = (result.handedness[i] && result.handedness[i][0]) || null;
    return {
        gesture: gesture ? (GESTURE_BY_CATEGORY[gesture.categoryName] || 'none') : 'none',
        score: gesture ? gesture.score : 0,
        side: handedness && handedness.categoryName === 'Left' ? 'left' : 'right',
        landmarks: landmarks.map(p => ({x: p.x, y: p.y, z: p.z}))
    };
});

/**
 * Track hands in a playing video element until stopped.
 * @param {HTMLVideoElement} video The element showing the camera.
 * @param {function(object): void} onResults Called with `{hands, t}` after every processed frame.
 * @param {object} [options] Options.
 * @param {string} [options.base] Prefix of the static asset paths.
 * @returns {Promise<{stop: function(): void}>} Resolves once the model is loaded and tracking runs.
 */
export const trackHands = async (video, onResults, {base = ''} = {}) => {
    const recognizer = await loadRecognizer(base);
    let running = true;
    let lastVideoTime = -1;

    const step = () => {
        if (!running) return;
        // A frame is processed once; the recognizer needs strictly increasing timestamps.
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            try {
                const result = recognizer.recognizeForVideo(video, performance.now());
                onResults({hands: toHands(result), t: Date.now()});
            } catch (err) {
                // One bad frame (for instance while the element resizes) is not worth stopping for.
                console.warn('[cameraAi] frame skipped:', err); // eslint-disable-line no-console
            }
        }
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);

    return {
        stop () {
            running = false;
        }
    };
};
