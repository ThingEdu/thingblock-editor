import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { detectLocale } from '../../../src/lib/preferences/detect-locale'
import { savePreference } from '../../../src/lib/preferences/user-preferences'

const supportedLocales = ['en', 'es', 'pt-br', 'de', 'it']

const setSearch = (search: string) => {
  window.history.replaceState(null, '', `/${search}`)
}

const setBrowserLanguage = (language: string) => {
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(language)
}

beforeEach(() => {
  setSearch('?name=val')
  setBrowserLanguage('en-US')
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('detectLocale', () => {
  test('uses locale from the URL when present', () => {
    setSearch('?locale=pt-br')
    expect(detectLocale(supportedLocales)).toBe('pt-br')
  })

  test('is case insensitive', () => {
    setSearch('?locale=pt-BR')
    expect(detectLocale(supportedLocales)).toBe('pt-br')
  })

  test('also accepts lang from the URL when present', () => {
    setSearch('?lang=it')
    expect(detectLocale(supportedLocales)).toBe('it')
  })

  test('ignores unsupported locales', () => {
    setSearch('?lang=sv')
    expect(detectLocale(supportedLocales)).toBe('en')
  })

  test('uses navigator language property for default if supported', () => {
    setBrowserLanguage('pt-BR')
    expect(detectLocale(supportedLocales)).toBe('pt-br')
  })

  test('ignores navigator language property if unsupported', () => {
    setBrowserLanguage('da')
    expect(detectLocale(supportedLocales)).toBe('en')
  })

  test('works with an empty locale', () => {
    setSearch('?locale=')
    expect(detectLocale(supportedLocales)).toBe('en')
  })

  test('if multiple, uses the first locale', () => {
    setSearch('?locale=de&locale=en')
    expect(detectLocale(supportedLocales)).toBe('de')
  })

  test('prefers the language the user chose last time over the browser language', () => {
    setSearch('')
    savePreference('locale', 'de')
    expect(detectLocale(supportedLocales)).toBe('de')
    // An explicit URL parameter still wins.
    setSearch('?locale=it')
    expect(detectLocale(supportedLocales)).toBe('it')
  })

  test('ignores a saved language that is not supported', () => {
    setSearch('')
    savePreference('locale', 'sv')
    expect(detectLocale(supportedLocales)).toBe('en')
  })
})
