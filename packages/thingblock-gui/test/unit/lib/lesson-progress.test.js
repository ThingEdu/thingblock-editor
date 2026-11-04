/* eslint-env jest */
import {loadProgress, saveProgress} from '../../../src/lib/lesson-progress';

test('round-trips progress per lesson', () => {
    saveProgress('den', {stepIndex: 2, passedSteps: [1, 2]});
    expect(loadProgress('den')).toEqual({stepIndex: 2, passedSteps: [1, 2]});
    expect(loadProgress('khac')).toBeNull();
});

test('a malformed entry loads as no progress', () => {
    window.localStorage.setItem('thingblock.lesson.hong', '{not json');
    expect(loadProgress('hong')).toBeNull();
});

// Review Focus 4: a kiosk or private window may refuse storage; the lesson must still open.
test('survives storage that throws', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
        get: () => {
            throw new Error('blocked');
        },
        configurable: true
    });
    expect(() => saveProgress('den', {stepIndex: 0, passedSteps: []})).not.toThrow();
    expect(loadProgress('den')).toBeNull();
    Object.defineProperty(window, 'localStorage', original);
});
