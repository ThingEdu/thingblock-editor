import {isRtl} from 'scratch-l10n';
import scratchEditorMessages from 'scratch-l10n/locales/editor-msgs';
import thingblockMessagesVi from '../locales/vi.json';

// scratch-l10n strings ThingBlock words differently, in every language but Vietnamese (vi.json has
// its own). A message missing from a locale shows its English `defaultMessage`, so these are English.
const thingblockOverrides = {
    // scratch-l10n names a new project "Scratch Project" ("Projet Scratch", …), which became the
    // saved file's name.
    'gui.gui.defaultProjectTitle': 'ThingBlock Project'
};

/**
 * The editor's messages: scratch-l10n's, with ThingBlock's wording on top.
 * ThingBlock's own GUI strings have no entry in scratch-l10n: English comes from each message's
 * `defaultMessage`, Vietnamese from src/locales/vi.json (edited by hand, keyed by message id).
 * @param {object} scratchMessages - scratch-l10n's messages by locale.
 * @param {object} viMessages - ThingBlock's Vietnamese messages.
 * @returns {object} messages by locale.
 */
const withThingBlockMessages = (scratchMessages, viMessages) => {
    const messages = {};
    for (const [locale, localeMessages] of Object.entries(scratchMessages)) {
        messages[locale] = {...localeMessages, ...thingblockOverrides};
    }
    messages.vi = {...scratchMessages.vi, ...thingblockOverrides, ...viMessages};
    return messages;
};

const editorMessages = withThingBlockMessages(scratchEditorMessages, thingblockMessagesVi);

const UPDATE_LOCALES = 'scratch-gui/locales/UPDATE_LOCALES';
const SELECT_LOCALE = 'scratch-gui/locales/SELECT_LOCALE';

const initialState = {
    isRtl: false,
    locale: 'en',
    messagesByLocale: editorMessages,
    messages: editorMessages.en
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SELECT_LOCALE:
        return Object.assign({}, state, {
            isRtl: isRtl(action.locale),
            locale: action.locale,
            messagesByLocale: state.messagesByLocale,
            messages: state.messagesByLocale[action.locale]
        });
    case UPDATE_LOCALES:
        return Object.assign({}, state, {
            isRtl: state.isRtl,
            locale: state.locale,
            messagesByLocale: action.messagesByLocale,
            messages: action.messagesByLocale[state.locale]
        });
    default:
        return state;
    }
};

const selectLocale = function (locale) {
    return {
        type: SELECT_LOCALE,
        locale: locale
    };
};

const setLocales = function (localesMessages) {
    return {
        type: UPDATE_LOCALES,
        messagesByLocale: localesMessages
    };
};
const initLocale = function (currentState, locale) {
    if (Object.prototype.hasOwnProperty.call(currentState.messagesByLocale, locale)) {
        return Object.assign(
            {},
            currentState,
            {
                isRtl: isRtl(locale),
                locale: locale,
                messagesByLocale: currentState.messagesByLocale,
                messages: currentState.messagesByLocale[locale]
            }
        );
    }
    // don't change locale if it's not in the current messages
    return currentState;
};
export {
    reducer as default,
    initialState as localesInitialState,
    withThingBlockMessages,
    initLocale,
    selectLocale,
    setLocales
};
