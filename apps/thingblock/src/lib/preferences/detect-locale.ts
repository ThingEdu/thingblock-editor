import { loadPreference } from './user-preferences'

/**
 * Picks the editor's locale: a `locale` or `lang` URL parameter wins, then the language the user chose last time on
 * this machine, then the browser's language, then English.
 * @param supportedLocales The locale codes the editor supports.
 * @returns The preferred locale.
 */
export const detectLocale = (supportedLocales: string[]): string => {
  let locale = 'en'
  let browserLocale = window.navigator.language.toLowerCase()
  const savedLocale = loadPreference('locale')
  if (savedLocale && supportedLocales.includes(savedLocale)) {
    locale = savedLocale
  } else if (supportedLocales.includes(browserLocale)) {
    locale = browserLocale
  } else {
    browserLocale = browserLocale.split('-')[0]
    if (supportedLocales.includes(browserLocale)) {
      locale = browserLocale
    }
  }

  const queryParams = new URLSearchParams(window.location.search)
  const potentialLocales = [...queryParams.getAll('locale'), ...queryParams.getAll('lang')].filter((l) => l)
  if (!potentialLocales.length) {
    return locale
  }

  const urlLocale = potentialLocales[0].toLowerCase()
  if (supportedLocales.includes(urlLocale)) {
    return urlLocale
  }

  return locale
}
