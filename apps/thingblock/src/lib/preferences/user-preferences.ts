/**
 * Per-machine editor preferences (the language and board the learner last chose), kept in
 * localStorage. Storage can be unavailable (private windows, blocked site data), so reads fall back to
 * null and writes are best effort.
 */

const PREFIX = 'thingblock.'

/**
 * @param key The preference name, e.g. `locale` or `device`.
 * @returns The saved value, or null when there is none or storage is unavailable.
 */
export const loadPreference = (key: string): string | null => {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

/**
 * @param key The preference name.
 * @param value The value to keep; null forgets it.
 */
export const savePreference = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, value)
  } catch {
    // Nothing to do: the preference is simply not remembered.
  }
}
