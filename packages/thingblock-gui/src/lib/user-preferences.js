/**
 * Per-machine editor preferences (the language and board the learner last chose), kept in
 * localStorage. Storage can be unavailable (private windows, blocked site data), so reads fall back to
 * null and writes are best effort.
 */

const PREFIX = 'thingblock.';

/**
 * @param {string} key The preference name, e.g. `locale` or `device`.
 * @returns {?string} The saved value, or null when there is none or storage is unavailable.
 */
const loadPreference = key => {
    try {
        return localStorage.getItem(PREFIX + key);
    } catch {
        return null;
    }
};

/**
 * @param {string} key The preference name.
 * @param {?string} value The value to keep; null forgets it.
 */
const savePreference = (key, value) => {
    try {
        if (value === null || typeof value === 'undefined') localStorage.removeItem(PREFIX + key);
        else localStorage.setItem(PREFIX + key, value);
    } catch {
        // Nothing to do: the preference is simply not remembered.
    }
};

export {loadPreference, savePreference};
