/**
 * The blocks workspace regenerates its Arduino code on a short debounce after each edit. Upload asks the
 * workspace to regenerate now, so a click right after an edit never uses the code from before it.
 */

let flush = null;

/**
 * Register the workspace's synchronous regeneration.
 * @param {function(): {generatedCode: string}} fn Regenerates the code now and returns it.
 * @returns {function(): void} Unregisters fn, if it is still the registered one.
 */
const registerCodeFlush = fn => {
    flush = fn;
    return () => {
        if (flush === fn) flush = null;
    };
};

/**
 * Regenerate the workspace code now.
 * @returns {?{generatedCode: string}} The fresh code, or null when no workspace is mounted.
 */
const flushGeneratedCode = () => (flush ? flush() : null);

export {flushGeneratedCode, registerCodeFlush};
