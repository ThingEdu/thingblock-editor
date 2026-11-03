import {loadPreference, savePreference} from '../../../src/lib/user-preferences';

afterEach(() => localStorage.clear());

test('round-trips a value under a ThingBlock key', () => {
    savePreference('device', 'thingbot');
    expect(loadPreference('device')).toBe('thingbot');
    expect(localStorage.getItem('thingblock.device')).toBe('thingbot');
});

test('saving null forgets the value', () => {
    savePreference('device', 'thingbot');
    savePreference('device', null);
    expect(loadPreference('device')).toBeNull();
});

test('storage that throws (private mode, blocked) reads as nothing and saves nothing', () => {
    const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
    });
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
    });
    try {
        expect(() => savePreference('locale', 'vi')).not.toThrow();
        expect(loadPreference('locale')).toBeNull();
    } finally {
        get.mockRestore();
        set.mockRestore();
    }
});
