import {translateVideo} from '../../../src/lib/libraries/decks/translate-video.js';

describe('translateVideo', () => {
    test('returns the id if it is not found', () => {
        expect(translateVideo('not-a-key', 'en')).toEqual('not-a-key');
    });

    test('returns the id unchanged for any locale', () => {
        expect(translateVideo('some-wistia-id', 'ja')).toEqual('some-wistia-id');
        expect(translateVideo('some-wistia-id', 'yum')).toEqual('some-wistia-id');
    });
});
