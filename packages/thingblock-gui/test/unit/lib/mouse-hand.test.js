import {
    MOUSE_GESTURES,
    gestureForKey,
    mouseHand,
    nextGesture,
    pointerPosition,
    trackMouse
} from '../../../src/lib/vision/mouse-hand';

const INDEX_TIP = 8;
const WRIST = 0;
const PALM = [0, 5, 9, 13, 17];

const near = (a, b) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

describe('mouseHand', () => {
    test('has the 21 landmarks of a MediaPipe hand, inside the frame for a pointer in the middle', () => {
        for (const gesture of MOUSE_GESTURES) {
            const hand = mouseHand({x: 0.5, y: 0.5, gesture, mirror: false});
            expect(hand.gesture).toBe(gesture);
            expect(hand.landmarks).toHaveLength(21);
            for (const p of hand.landmarks) {
                expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
                expect(p.x).toBeGreaterThan(0);
                expect(p.x).toBeLessThan(1);
                expect(p.y).toBeGreaterThan(0);
                expect(p.y).toBeLessThan(1);
            }
        }
    });

    test('puts the open hand\'s index fingertip on the pointer, the wrist below it', () => {
        const hand = mouseHand({x: 0.3, y: 0.4, gesture: 'open', mirror: false});
        near(hand.landmarks[INDEX_TIP].x, 0.3);
        near(hand.landmarks[INDEX_TIP].y, 0.4);
        expect(hand.landmarks[WRIST].y).toBeGreaterThan(0.5);
    });

    test('a mirrored view stores the frame point the camera would see, so blocks and drawing agree', () => {
        const hand = mouseHand({x: 0.3, y: 0.4, gesture: 'open', mirror: true});
        near(hand.landmarks[INDEX_TIP].x, 0.7);
        near(hand.landmarks[INDEX_TIP].y, 0.4);
    });

    test('a fist keeps the wrist in place and curls the index finger towards the palm', () => {
        const open = mouseHand({x: 0.5, y: 0.5, gesture: 'open', mirror: false});
        const fist = mouseHand({x: 0.5, y: 0.5, gesture: 'fist', mirror: false});
        near(fist.landmarks[WRIST].x, open.landmarks[WRIST].x);
        near(fist.landmarks[WRIST].y, open.landmarks[WRIST].y);
        const palmY = PALM.reduce((sum, i) => sum + fist.landmarks[i].y, 0) / PALM.length;
        const reach = hand => Math.abs(hand.landmarks[INDEX_TIP].y - palmY);
        expect(reach(fist)).toBeLessThan(reach(open) / 2);
    });

    test('an unknown gesture draws an open hand', () => {
        expect(mouseHand({x: 0.5, y: 0.5, gesture: 'wave', mirror: false}).gesture).toBe('open');
    });
});

describe('pointer mapping', () => {
    const rect = {left: 100, top: 50, width: 400, height: 300};

    test('maps the pointer to fractions of the playground', () => {
        expect(pointerPosition({clientX: 300, clientY: 200}, rect)).toEqual({x: 0.5, y: 0.5});
        expect(pointerPosition({clientX: 100, clientY: 350}, rect)).toEqual({x: 0, y: 1});
    });

    test('is null outside the playground or before it has a size', () => {
        expect(pointerPosition({clientX: 99, clientY: 200}, rect)).toBeNull();
        expect(pointerPosition({clientX: 300, clientY: 351}, rect)).toBeNull();
        expect(pointerPosition({clientX: 0, clientY: 0}, {left: 0, top: 0, width: 0, height: 0})).toBeNull();
    });

    test('the right button steps through the gestures but never to the fist', () => {
        const seen = [];
        let g = 'open';
        for (let i = 0; i < MOUSE_GESTURES.length; i++) {
            g = nextGesture(g);
            seen.push(g);
        }
        expect(seen).not.toContain('fist');
        expect(seen[seen.length - 1]).toBe('victory');
        expect(nextGesture('fist')).toBe('open');
    });

    test('number keys 1–7 pick a gesture, other keys none', () => {
        expect(gestureForKey('1')).toBe('open');
        expect(gestureForKey('2')).toBe('victory');
        expect(gestureForKey('7')).toBe('fist');
        expect(gestureForKey('0')).toBeNull();
        expect(gestureForKey('8')).toBeNull();
        expect(gestureForKey('a')).toBeNull();
    });
});

describe('trackMouse', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const setup = () => {
        const element = document.createElement('div');
        element.getBoundingClientRect = () => ({left: 0, top: 0, width: 200, height: 100});
        document.body.appendChild(element);
        const frames = [];
        const tracker = trackMouse(element, r => frames.push(r), () => false);
        const fire = (target, type, init) => {
            const e = new MouseEvent(type, {bubbles: true, ...init});
            target.dispatchEvent(e);
            return e;
        };
        return {element, frames, tracker, fire};
    };

    test('reports no hand until the pointer is on the playground, then a hand that follows it', () => {
        const {element, frames, tracker, fire} = setup();
        jest.advanceTimersByTime(40);
        expect(frames[frames.length - 1].hands).toEqual([]);

        fire(element, 'pointermove', {clientX: 50, clientY: 50});
        jest.advanceTimersByTime(40);
        const hand = frames[frames.length - 1].hands[0];
        near(hand.landmarks[INDEX_TIP].x, 0.25);
        near(hand.landmarks[INDEX_TIP].y, 0.5);
        expect(hand.gesture).toBe('open');

        fire(element, 'pointerleave', {});
        jest.advanceTimersByTime(40);
        expect(frames[frames.length - 1].hands).toEqual([]);
        tracker.stop();
    });

    test('holding the left button makes a fist; the right button and keys change the gesture', () => {
        const {element, frames, tracker, fire} = setup();
        const last = () => frames[frames.length - 1].hands[0].gesture;
        fire(element, 'pointerdown', {clientX: 50, clientY: 50, button: 0});
        jest.advanceTimersByTime(40);
        expect(last()).toBe('fist');
        fire(window, 'pointerup', {button: 0});
        jest.advanceTimersByTime(40);
        expect(last()).toBe('open');

        const menu = fire(element, 'contextmenu', {cancelable: true, button: 2});
        expect(menu.defaultPrevented).toBe(true);
        jest.advanceTimersByTime(40);
        expect(last()).toBe('victory');

        window.dispatchEvent(new KeyboardEvent('keydown', {key: '4'}));
        jest.advanceTimersByTime(40);
        expect(last()).toBe('thumb_up');
        tracker.stop();
    });

    test('stop ends the frames and the listeners', () => {
        const {element, frames, tracker, fire} = setup();
        tracker.stop();
        const count = frames.length;
        fire(element, 'pointermove', {clientX: 50, clientY: 50});
        jest.advanceTimersByTime(200);
        expect(frames).toHaveLength(count);
    });
});
