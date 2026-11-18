import cookie from 'cookie'
import { type ColorMode, DEFAULT_MODE, HIGH_CONTRAST_MODE } from '.'

const PREFERS_HIGH_CONTRAST_QUERY = '(prefers-contrast: more)'
// Technically what we are persisting is the color mode, but for historical reasons,
// we should continue using 'scratchtheme' as the cookie key.
const COOKIE_KEY = 'scratchtheme'

// Dark mode isn't enabled yet
const isValidColorMode = (colorMode: unknown): colorMode is ColorMode =>
  colorMode === DEFAULT_MODE || colorMode === HIGH_CONTRAST_MODE

const systemPreferencesColorMode = (): ColorMode => {
  if (window.matchMedia(PREFERS_HIGH_CONTRAST_QUERY).matches) return HIGH_CONTRAST_MODE

  return DEFAULT_MODE
}

export const detectColorMode = (): ColorMode => {
  const colorModeCookie = cookie.parse(document.cookie)[COOKIE_KEY]

  if (isValidColorMode(colorModeCookie)) return colorModeCookie

  // No cookie set. Fall back to system preferences
  return systemPreferencesColorMode()
}

export const persistColorMode = (mode: ColorMode) => {
  if (!isValidColorMode(mode)) {
    throw new Error(`Invalid color mode: ${String(mode)}`)
  }

  if (systemPreferencesColorMode() === mode) {
    // Clear the cookie to represent using the system preferences
    document.cookie = `${COOKIE_KEY}=;path=/`
    return
  }

  const expires = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toUTCString()
  document.cookie = `${COOKIE_KEY}=${mode};expires=${expires};path=/`
}
