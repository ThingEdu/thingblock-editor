import {drawPicture, objectImage, pictureSize} from '../../../src/lib/vision/object-images';

describe('playground pictures', () => {
    test('the cricket and the robot Tre load from the static folder; other kinds keep their emoji', () => {
        expect(objectImage('ball', '')).toBeNull();
        // Not loaded yet in jsdom: the playground falls back to the emoji.
        expect(objectImage('cricket', 'http://x/')).toBeNull();
        expect(objectImage('tre', 'http://x/')).toBeNull();
    });

    test('a picture fits inside the round hit area, keeping its shape', () => {
        const cricket = pictureSize('cricket', 100, 54 / 25);
        expect(cricket.width).toBeLessThanOrEqual(100);
        expect(cricket.width / cricket.height).toBeCloseTo(54 / 25);
        // A wide mark inside a circle: its corners stay within the badge.
        expect(Math.hypot(cricket.width / 2, cricket.height / 2)).toBeLessThanOrEqual(50);
        const tre = pictureSize('tre', 80, 1);
        expect(tre).toEqual({width: 80 * 0.96, height: 80 * 0.96});
    });

    test('draws a light badge the size of the object and mirrors a picture moving left', () => {
        const calls = [];
        const ctx = new Proxy({}, {
            get: (target, key) => (key in target ? target[key] : (...args) => calls.push([key, ...args])),
            set: (target, key, value) => {
                target[key] = value;
                return true;
            }
        });
        const img = {naturalWidth: 216, naturalHeight: 100};
        drawPicture(ctx, img, {kind: 'cricket', vx: -50}, 100, 80, 60);
        expect(calls.find(c => c[0] === 'arc')).toEqual(['arc', 100, 80, 30, 0, Math.PI * 2]);
        expect(calls.find(c => c[0] === 'scale')).toEqual(['scale', -1, 1]);
        calls.length = 0;
        drawPicture(ctx, img, {kind: 'cricket', vx: 0}, 100, 80, 60);
        expect(calls.some(c => c[0] === 'scale')).toBe(false);
        expect(calls.find(c => c[0] === 'drawImage')[1]).toBe(img);
    });
});
