import cookie from 'cookie'
import { DEFAULT_LINK_MODE, type LinkMode, isValidLinkMode } from '.'

const COOKIE_KEY = 'scratchlinkmode'

export const detectLinkMode = (): LinkMode => {
  const linkModeCookie = cookie.parse(document.cookie)[COOKIE_KEY]

  if (isValidLinkMode(linkModeCookie)) return linkModeCookie

  return DEFAULT_LINK_MODE
}

export const persistLinkMode = (mode: LinkMode) => {
  if (!isValidLinkMode(mode)) {
    throw new Error(`Invalid link mode: ${String(mode)}`)
  }

  const expires = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toUTCString()
  document.cookie = `${COOKIE_KEY}=${mode};expires=${expires};path=/`
}
