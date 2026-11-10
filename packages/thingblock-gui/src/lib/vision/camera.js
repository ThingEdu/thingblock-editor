/**
 * The webcam: one stream at a time, at the size the hand tracker likes.
 */

/** The frame size asked of the camera; the models run on 192–256 px internally, so more is waste. */
const WIDTH = 640;
const HEIGHT = 480;

/**
 * The cameras this computer offers, a phone shown as a webcam (Continuity Camera, DroidCam, Iriun)
 * among them. Names are empty until the page has been allowed a camera once.
 * @returns {Promise<Array<{id: string, name: string}>>} One entry per camera.
 */
export const listCameras = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({id: d.deviceId, name: d.label || `Camera ${i + 1}`}));
};

/**
 * Open a camera.
 * @param {string} [deviceId] The camera to open; the browser's default when omitted.
 * @returns {Promise<MediaStream>} The video stream.
 * @throws {Error} With a `name` of `NotAllowedError` when the person denied the camera, `NotFoundError`
 *   when there is none, or `NotSupportedError` when the page cannot ask (no `getUserMedia`).
 */
export const startCamera = async deviceId => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const err = new Error('getUserMedia is not available');
        err.name = 'NotSupportedError';
        throw err;
    }
    return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ?
            {width: {ideal: WIDTH}, height: {ideal: HEIGHT}, deviceId: {exact: deviceId}} :
            {width: {ideal: WIDTH}, height: {ideal: HEIGHT}, facingMode: 'user'}
    });
};

/**
 * Release the webcam.
 * @param {MediaStream|null} stream The stream from `startCamera`.
 */
export const stopCamera = stream => {
    if (!stream) return;
    for (const track of stream.getTracks()) track.stop();
};

/**
 * Play a stream in a video element and resolve once frames arrive.
 * @param {HTMLVideoElement} video The element.
 * @param {MediaStream} stream The stream.
 * @returns {Promise<void>} Resolves when the first frame can be read.
 */
export const attachStream = (video, stream) => new Promise((resolve, reject) => {
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    const onReady = () => {
        video.removeEventListener('loadeddata', onReady);
        resolve();
    };
    video.addEventListener('loadeddata', onReady);
    video.play().catch(reject);
});
