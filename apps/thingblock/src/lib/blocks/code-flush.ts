/**
 * The blocks workspace regenerates its Arduino code on a short debounce after each edit. Upload asks the
 * workspace to regenerate now, so a click right after an edit never uses the code from before it.
 */

type CodeFlush = () => { generatedCode: string }

let flush: CodeFlush | null = null

/**
 * Registers the workspace's synchronous regeneration.
 * @param fn Regenerates the code now and returns it.
 * @returns A function that unregisters `fn`, if it is still the registered one.
 */
export const registerCodeFlush = (fn: CodeFlush) => {
  flush = fn
  return () => {
    if (flush === fn) flush = null
  }
}

/**
 * Regenerates the workspace code now.
 * @returns The fresh code, or null when no workspace is mounted.
 */
export const flushGeneratedCode = () => (flush ? flush() : null)
