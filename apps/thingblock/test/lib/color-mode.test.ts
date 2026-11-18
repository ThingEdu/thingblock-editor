import { describe, expect, test } from 'vitest'
import {
  DARK_MODE,
  DEFAULT_MODE,
  HIGH_CONTRAST_MODE,
  defaultColors,
  getColorsForMode,
} from '../../src/lib/settings/color-mode'
import { detectColorMode, persistColorMode } from '../../src/lib/settings/color-mode/persistence'

describe('color modes', () => {
  test('a mode overrides the default colors', () => {
    expect(getColorsForMode(DARK_MODE).motion.colourPrimary).toBe('#0F1E33')
  })

  test('a mode falls back to the default colors it does not set', () => {
    expect(getColorsForMode(DARK_MODE).numPadBackground).toBe(defaultColors.numPadBackground)
  })
})

describe('color mode persistence', () => {
  test('returns the color mode stored in a cookie', () => {
    document.cookie = `scratchtheme=${HIGH_CONTRAST_MODE}`
    expect(detectColorMode()).toBe(HIGH_CONTRAST_MODE)
  })

  test('returns the system color mode when no cookie', () => {
    document.cookie = 'scratchtheme='
    expect(detectColorMode()).toBe(DEFAULT_MODE)
  })

  test('persists color mode to cookie', () => {
    document.cookie = 'scratchtheme='
    persistColorMode(HIGH_CONTRAST_MODE)
    expect(document.cookie).toBe(`scratchtheme=${HIGH_CONTRAST_MODE}`)
  })

  test('clears color mode when matching system preferences', () => {
    document.cookie = `scratchtheme=${HIGH_CONTRAST_MODE}`
    persistColorMode(DEFAULT_MODE)
    expect(document.cookie).toBe('scratchtheme=')
  })
})
