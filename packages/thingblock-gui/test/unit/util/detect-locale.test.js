import {detectLocale} from '../../../src/lib/detect-locale.js';
import {savePreference} from '../../../src/lib/user-preferences.js';

const supportedLocales = ['en', 'es', 'pt-br', 'de', 'it'];

/**
 * @type {jest.SpyInstance}
 */
let windowSpy;

/**
 * @type {jest.SpyInstance}
 */
let locationSpy;

const mockWindowLocation = new URL('http://example.com/?name=val');
const mockWindowNavigator = {
    language: 'en-US'
};

beforeEach(() => {
    windowSpy = jest.spyOn(global, 'window', 'get');
    locationSpy = jest.spyOn(global, 'location', 'get');

    windowSpy.mockImplementation(() => ({
        location: mockWindowLocation,
        navigator: mockWindowNavigator
    }));

    // `window.location` and `location` should point to the same object
    locationSpy.mockImplementation(() => mockWindowLocation);
});

afterEach(() => {
    windowSpy.mockRestore();
    locationSpy.mockRestore();
});

describe('detectLocale', () => {
    test('uses locale from the URL when present', () => {
        mockWindowLocation.search = '?locale=pt-br';
        expect(detectLocale(supportedLocales)).toEqual('pt-br');
    });

    test('is case insensitive', () => {
        mockWindowLocation.search = '?locale=pt-BR';
        expect(detectLocale(supportedLocales)).toEqual('pt-br');
    });

    test('also accepts lang from the URL when present', () => {
        mockWindowLocation.search = '?lang=it';
        expect(detectLocale(supportedLocales)).toEqual('it');
    });

    test('ignores unsupported locales', () => {
        mockWindowLocation.search = '?lang=sv';
        expect(detectLocale(supportedLocales)).toEqual('en');
    });

    test('ignores other parameters', () => {
        mockWindowLocation.search = '?enable=language';
        expect(detectLocale(supportedLocales)).toEqual('en');
    });

    test('uses navigator language property for default if supported', () => {
        mockWindowNavigator.language = 'pt-BR';
        expect(detectLocale(supportedLocales)).toEqual('pt-br');
    });

    test('ignores navigator language property if unsupported', () => {
        mockWindowNavigator.language = 'da';
        expect(detectLocale(supportedLocales)).toEqual('en');
    });

    test('works with an empty locale', () => {
        mockWindowLocation.search = '?locale=';
        expect(detectLocale(supportedLocales)).toEqual('en');
    });

    test('if multiple, uses the first locale', () => {
        mockWindowLocation.search = '?locale=de&locale=en';
        expect(detectLocale(supportedLocales)).toEqual('de');
    });

    test('prefers the language the user chose last time over the browser language', () => {
        mockWindowLocation.search = '';
        mockWindowNavigator.language = 'en-US';
        savePreference('locale', 'de');
        try {
            expect(detectLocale(supportedLocales)).toEqual('de');
            // An explicit URL parameter still wins.
            mockWindowLocation.search = '?locale=it';
            expect(detectLocale(supportedLocales)).toEqual('it');
        } finally {
            localStorage.clear();
        }
    });

    test('ignores a saved language that is not supported', () => {
        mockWindowLocation.search = '';
        mockWindowNavigator.language = 'en-US';
        savePreference('locale', 'sv');
        try {
            expect(detectLocale(supportedLocales)).toEqual('en');
        } finally {
            localStorage.clear();
        }
    });
});
