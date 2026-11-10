/**
 * Hands and gestures from a video element, through MediaPipe's gesture recognizer, and the body (33
 * landmarks) through its pose landmarker when the project asks for it. The models and their WASM runtime
 * are served from the editor's own static files, so this works offline.
 */

import {FilesetResolver, GestureRecognizer, PoseLandmarker} from '@mediapipe/tasks-vision';

/** Where webpack copies the MediaPipe runtime (see webpack.config.js) and where the model lives. */
const WASM_PATH = 'static/mediapipe/wasm';
const MODEL_PATH = 'static/ai-models/gesture_recognizer.task';
const POSE_MODEL_PATH = 'static/ai-models/pose_landmarker_lite.task';

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

/** Pose landmark pairs drawn as the upper body: shoulders, arms and the sides of the trunk. */
export const POSE_CONNECTIONS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]
];

let recognizerPromise = null;
let posePromise = null;
let filesetPromise = null;

const loadFileset = base => {
    if (!filesetPromise) {
        filesetPromise = FilesetResolver.forVisionTasks(base + WASM_PATH).catch(err => {
            filesetPromise = null;
            throw err;
        });
    }
    return filesetPromise;
};

/**
 * Create a MediaPipe task on the GPU, or on the CPU where WebGL 2 is missing.
 * @param {function(string): Promise<object>} create Builds the task for a delegate.
 * @returns {Promise<object>} The task.
 */
const onGpuOrCpu = async create => {
    try {
        return await create('GPU');
    } catch (err) {
        console.warn('[cameraAi] GPU delegate unavailable, using CPU:', err); // eslint-disable-line no-console
        return create('CPU');
    }
};

/**
 * Load the pose landmarker once; later calls share it. Only projects with head or body blocks need it.
 * @param {string} base Prefix of the static paths.
 * @returns {Promise<PoseLandmarker>} The model, ready for video.
 */
const loadPose = base => {
    if (!posePromise) {
        posePromise = loadFileset(base)
            .then(vision => onGpuOrCpu(delegate => PoseLandmarker.createFromOptions(vision, {
                baseOptions: {modelAssetPath: base + POSE_MODEL_PATH, delegate},
                runningMode: 'VIDEO',
                numPoses: 1
            })))
            .catch(err => {
                posePromise = null;
                throw err;
            });
    }
    return posePromise;
};

/**
 * Load the recognizer once; later calls share it.
 * @param {string} base Prefix of the static paths, '' in the dev server.
 * @returns {Promise<GestureRecognizer>} The model, ready for video.
 */
const loadRecognizer = base => {
    if (!recognizerPromise) {
        // The GPU path needs WebGL 2; a machine or WebView without it still gets the CPU path.
        recognizerPromise = loadFileset(base)
            .then(vision => onGpuOrCpu(delegate => GestureRecognizer.createFromOptions(vision, {
                baseOptions: {modelAssetPath: base + MODEL_PATH, delegate},
                runningMode: 'VIDEO',
                numHands: 2
            })))
            .catch(err => {
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
        // MediaPipe labels hands for a mirrored picture; camera frames are not mirrored, so swap.
        side: handedness && handedness.categoryName === 'Left' ? 'right' : 'left',
        landmarks: landmarks.map(p => ({x: p.x, y: p.y, z: p.z}))
    };
});

/**
 * Turn one pose result into the shape the VM takes.
 * @param {object} result A `PoseLandmarkerResult`.
 * @returns {?{landmarks: Array<object>}} The first person's body, or null when nobody was found.
 */
const toPose = result => {
    const landmarks = result.landmarks[0];
    if (!landmarks) return null;
    return {landmarks: landmarks.map(p => ({x: p.x, y: p.y, z: p.z, visibility: p.visibility}))};
};

/**
 * Track hands in a playing video element until stopped, and the body while `wantPose` says so.
 * @param {HTMLVideoElement} video The element showing the camera.
 * @param {function(object): void} onResults Called with `{hands, pose, t}` after every processed frame;
 *   `pose` is null until the body model has loaded, and whenever it is not wanted.
 * @param {object} [options] Options.
 * @param {string} [options.base] Prefix of the static asset paths.
 * @param {function(): boolean} [options.wantPose] Whether the project uses the head and body blocks.
 * @returns {Promise<{stop: function(): void}>} Resolves once the hand model is loaded and tracking runs.
 */
export const trackHands = async (video, onResults, {base = '', wantPose = () => false} = {}) => {
    const recognizer = await loadRecognizer(base);
    let running = true;
    let lastVideoTime = -1;
    // Loaded the first time the project wants it; hands keep running meanwhile.
    let poseModel = null;
    let poseLoading = false;
    const pose = () => {
        if (!wantPose()) return null;
        if (!poseModel) {
            if (!poseLoading) {
                poseLoading = true;
                loadPose(base)
                    .then(model => {
                        poseModel = model;
                    })
                    .catch(err => {
                        console.warn('[cameraAi] body model failed to load:', err); // eslint-disable-line no-console
                    });
            }
            return null;
        }
        return toPose(poseModel.detectForVideo(video, performance.now()));
    };

    const step = () => {
        if (!running) return;
        // A frame is processed once; the recognizer needs strictly increasing timestamps.
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            try {
                const result = recognizer.recognizeForVideo(video, performance.now());
                onResults({hands: toHands(result), pose: pose(), t: Date.now()});
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
