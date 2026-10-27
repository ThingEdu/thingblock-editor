import type {StreamCallbacks} from './types';

/** A no-op, the default for any callback the caller omits. */
const noop = () => {};

/**
 * Fill any omitted callback with a no-op so the caller of the result can invoke every hook
 * unconditionally.
 */
export const withDefaults = (callbacks: StreamCallbacks = {}): Required<StreamCallbacks> => ({
    onLog: callbacks.onLog || noop,
    onProgress: callbacks.onProgress || noop
});
