/**
 * The streaming-callback interface for a {@link Client}'s long-running operations (`compile` and
 * `flash`). A caller passes the hooks it cares about; the client fills any it omits with a no-op via
 * {@link withDefaults}, so a handler can invoke every callback unconditionally without guarding for
 * `undefined`.
 *
 * @typedef {object} StreamCallbacks
 * @property {function(string):void} [onLog] - receives each stdout/stderr chunk from the operation.
 * @property {function({phase: string, percent: number}):void} [onProgress] - receives progress updates.
 */

/** A no-op, the default for any callback the caller omits. */
const noop = () => {};

/**
 * Fill any omitted callback with a no-op so the caller of the result can invoke every hook
 * unconditionally.
 * @param {StreamCallbacks} [callbacks] - the caller-supplied callbacks; may be partial or absent.
 * @returns {{onLog: function, onProgress: function}} the callbacks with omitted hooks filled in.
 */
const withDefaults = (callbacks = {}) => ({
    onLog: callbacks.onLog || noop,
    onProgress: callbacks.onProgress || noop
});

module.exports = {withDefaults};
