/**
 * Plays recorded or generated hand frames in place of the camera and the model, so a project can be
 * shown and checked without a webcam and without filming anyone.
 */

/**
 * Play frames in a loop, at their own pace.
 * @param {Array<{dt: number, hands: Array<object>}>} frames Hands as the tracker reports them, each
 *   with the milliseconds to wait before the next frame.
 * @param {function(object): void} onResults Called with `{hands, t}` for every frame.
 * @returns {{stop: function(): void}} Stops the playback.
 */
export const replayHands = (frames, onResults) => {
    let running = true;
    let index = 0;
    let timer = null;
    const step = () => {
        if (!running) return;
        const frame = frames[index];
        index = (index + 1) % frames.length;
        onResults({hands: frame.hands, t: Date.now()});
        timer = setTimeout(step, frame.dt);
    };
    step();
    return {
        stop () {
            running = false;
            clearTimeout(timer);
        }
    };
};
