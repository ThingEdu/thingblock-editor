/**
 * @file
 * Utility function to detect locale from the browser setting or paramenter on the URL.
 */

import queryString from 'query-string';
import {loadPreference} from './user-preferences';

/**
 * look for the language the user last chose, then the browser setting. Check against supported locales.
 * If there's a parameter in the URL, override the browser setting
 * @param {Array.string} supportedLocales An array of supported locale codes.
 * @returns {string} the preferred locale
 */
const detectLocale = supportedLocales => {
    let locale = 'en'; // default
    let browserLocale = window.navigator.userLanguage || window.navigator.language;
    browserLocale = browserLocale.toLowerCase();
    const savedLocale = loadPreference('locale');
    // the language the user chose last time on this machine wins over the browser's
    if (savedLocale && supportedLocales.includes(savedLocale)) {
        locale = savedLocale;
    } else if (supportedLocales.includes(browserLocale)) {
        locale = browserLocale;
    } else {
        browserLocale = browserLocale.split('-')[0];
        if (supportedLocales.includes(browserLocale)) {
            locale = browserLocale;
        }
    }

    const queryParams = queryString.parse(location.search);
    // Flatten potential arrays and remove falsy values
    const potentialLocales = [].concat(queryParams.locale, queryParams.lang).filter(l => l);
    if (!potentialLocales.length) {
        return locale;
    }

    const urlLocale = potentialLocales[0].toLowerCase();
    if (supportedLocales.includes(urlLocale)) {
        return urlLocale;
    }

    return locale;
};

export {
    detectLocale
};
