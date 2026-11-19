import cookie from 'cookie'
import { CAT_BLOCKS_THEME, DEFAULT_THEME, type Theme } from '.'

const COOKIE_KEY = 'scratchblockstheme'

const isValidTheme = (theme: unknown): theme is Theme => theme === DEFAULT_THEME || theme === CAT_BLOCKS_THEME

export const detectTheme = (): Theme => {
  const themeCookie = cookie.parse(document.cookie)[COOKIE_KEY]

  if (isValidTheme(themeCookie)) return themeCookie

  return DEFAULT_THEME
}

export const persistTheme = (theme: Theme) => {
  if (!isValidTheme(theme)) {
    throw new Error(`Invalid theme: ${String(theme)}`)
  }

  const expires = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toUTCString()
  document.cookie = `${COOKIE_KEY}=${theme};expires=${expires};path=/`
}
