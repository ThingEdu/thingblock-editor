import { isRtl } from 'scratch-l10n'
import scratchEditorMessages from 'scratch-l10n/locales/editor-msgs'
import thingblockMessagesVi from '../locales/vi.json'

/** Message text keyed by message id. */
export type Messages = Record<string, string>

/** Each locale's messages, keyed by locale code. */
export type MessagesByLocale = Record<string, Messages>

// scratch-l10n strings ThingBlock words differently, in every language but Vietnamese (vi.json has
// its own). A message missing from a locale shows its English `defaultMessage`, so these are English.
const thingblockOverrides: Messages = {
  // scratch-l10n names a new project "Scratch Project" ("Projet Scratch", …), which became the
  // saved file's name.
  'gui.gui.defaultProjectTitle': 'ThingBlock Project',
}

/**
 * The editor's messages: scratch-l10n's, with ThingBlock's wording on top.
 * ThingBlock's own GUI strings have no entry in scratch-l10n: English comes from each message's
 * `defaultMessage`, Vietnamese from src/locales/vi.json (edited by hand, keyed by message id).
 * @param scratchMessages - scratch-l10n's messages by locale.
 * @param viMessages - ThingBlock's Vietnamese messages.
 * @returns Messages by locale.
 */
export const withThingBlockMessages = (scratchMessages: MessagesByLocale, viMessages: Messages): MessagesByLocale => {
  const messages: MessagesByLocale = {}
  for (const [locale, localeMessages] of Object.entries(scratchMessages)) {
    messages[locale] = { ...localeMessages, ...thingblockOverrides }
  }
  messages.vi = { ...scratchMessages.vi, ...thingblockOverrides, ...viMessages }
  return messages
}

const editorMessages = withThingBlockMessages(scratchEditorMessages, thingblockMessagesVi)

const UPDATE_LOCALES = 'scratch-gui/locales/UPDATE_LOCALES'
const SELECT_LOCALE = 'scratch-gui/locales/SELECT_LOCALE'

export interface LocalesState {
  isRtl: boolean
  locale: string
  messagesByLocale: MessagesByLocale
  messages: Messages
}

type LocalesAction =
  | { type: typeof SELECT_LOCALE; locale: string }
  | { type: typeof UPDATE_LOCALES; messagesByLocale: MessagesByLocale }

export const localesInitialState: LocalesState = {
  isRtl: false,
  locale: 'en',
  messagesByLocale: editorMessages,
  messages: editorMessages.en,
}

const reducer = (state = localesInitialState, action: LocalesAction): LocalesState => {
  switch (action.type) {
    case SELECT_LOCALE:
      return {
        ...state,
        isRtl: isRtl(action.locale),
        locale: action.locale,
        messages: state.messagesByLocale[action.locale],
      }
    case UPDATE_LOCALES:
      return {
        ...state,
        messagesByLocale: action.messagesByLocale,
        messages: action.messagesByLocale[state.locale],
      }
    default:
      return state
  }
}

export const selectLocale = (locale: string): LocalesAction => ({ type: SELECT_LOCALE, locale })

export const setLocales = (messagesByLocale: MessagesByLocale): LocalesAction => ({
  type: UPDATE_LOCALES,
  messagesByLocale,
})

/**
 * Switches the initial state to a locale, if there are messages for it.
 * @param currentState - The locales state.
 * @param locale - The locale to switch to.
 * @returns The new state, or the current one when the locale has no messages.
 */
export const initLocale = (currentState: LocalesState, locale: string): LocalesState => {
  if (!Object.hasOwn(currentState.messagesByLocale, locale)) return currentState

  return {
    ...currentState,
    isRtl: isRtl(locale),
    locale,
    messages: currentState.messagesByLocale[locale],
  }
}

export default reducer
