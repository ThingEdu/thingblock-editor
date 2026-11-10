/**
 * A hand drawn from the mouse, for computers without a webcam: the index fingertip follows the pointer
 * over the playground, the left button closes the hand into a fist, and the right button or the number
 * keys pick another gesture. The landmarks are built from joint angles, never from a picture of anyone,
 * in the same 21-point order and normalized frame as MediaPipe's, so the blocks cannot tell the
 * difference.
 */

/** Finger bases relative to the wrist (hand space: x right, y up, in hand lengths), and segment lengths. */
const FINGERS = [
    {base: [-0.30, 0.25], dir: -55, segs: [0.22, 0.18, 0.15], idx: [1, 2, 3, 4]}, // thumb
    {base: [-0.16, 0.62], dir: -8, segs: [0.30, 0.18, 0.15], idx: [5, 6, 7, 8]}, // index
    {base: [0.00, 0.66], dir: 0, segs: [0.32, 0.20, 0.16], idx: [9, 10, 11, 12]}, // middle
    {base: [0.15, 0.62], dir: 8, segs: [0.30, 0.18, 0.15], idx: [13, 14, 15, 16]}, // ring
    {base: [0.28, 0.54], dir: 16, segs: [0.24, 0.15, 0.13], idx: [17, 18, 19, 20]} // pinky
];

/** How bent each finger is (0 straight … 1 fully curled), thumb first, and how the hand is turned. */
const POSES = {
    open: {bend: [0, 0, 0, 0, 0], tilt: 0},
    fist: {bend: [0.8, 1, 1, 1, 1], tilt: 0},
    victory: {bend: [0.8, 0, 0, 1, 1], tilt: 0},
    point_up: {bend: [0.8, 0, 1, 1, 1], tilt: 0},
    thumb_up: {bend: [0, 1, 1, 1, 1], tilt: 0},
    // Upside down: the wrist above the pointer, the thumb hanging below.
    thumb_down: {bend: [0, 1, 1, 1, 1], tilt: 180},
    i_love_you: {bend: [0, 0, 1, 1, 0], tilt: 0}
};

/** The gestures the right button and the number keys 1–7 step through, in this order. */
export const MOUSE_GESTURES = ['open', 'victory', 'point_up', 'thumb_up', 'thumb_down', 'i_love_you', 'fist'];

/** The hand's length as a fraction of the frame height. */
const HAND_SIZE = 0.2;

const rad = d => (d * Math.PI) / 180;

/**
 * A hand's landmarks in hand space, wrist at the origin, y up.
 * @param {string} gesture A key of POSES.
 * @returns {Array<Array<number>>} 21 `[x, y]` points.
 */
const handShape = gesture => {
    const {bend} = POSES[gesture] || POSES.open;
    const pts = new Array(21);
    pts[0] = [0, 0];
    FINGERS.forEach((f, i) => {
        let [x, y] = f.base;
        let angle = 90 - f.dir;
        pts[f.idx[0]] = [x, y];
        f.segs.forEach((len, k) => {
            // Seen from the front, a curled finger folds back over the palm and looks shorter; the thumb
            // folds across the palm instead.
            if (i === 0) angle -= bend[i] * 55;
            else if (k > 0) angle += bend[i] * 80;
            const shown = len * (1 - (0.45 * bend[i]));
            x += shown * Math.cos(rad(angle));
            y += shown * Math.sin(rad(angle));
            pts[f.idx[k + 1]] = [x, y];
        });
    });
    return pts;
};

/** Where the open hand's index fingertip sits from the wrist; the wrist is placed so that tip is on the pointer. */
const OPEN_TIP = handShape('open')[8];

/**
 * The hand the tracker would report for a pointer at a point of the playground.
 * @param {object} pointer Where the pointer is and what the hand does.
 * @param {number} pointer.x Pointer x across the playground as the viewer sees it, 0 (left) … 1 (right).
 * @param {number} pointer.y Pointer y down the playground, 0 (top) … 1 (bottom).
 * @param {string} pointer.gesture One of MOUSE_GESTURES.
 * @param {boolean} pointer.mirror Whether the picture is shown mirrored; camera frames are not, so a
 *   mirrored view puts the hand at `1 - x` in the frame.
 * @returns {{gesture: string, score: number, side: string, landmarks: Array<{x: number, y: number, z: number}>}}
 *   The hand, as `trackHands` reports one.
 */
export const mouseHand = ({x, y, gesture, mirror}) => {
    const pose = POSES[gesture] ? gesture : 'open';
    const tilt = rad(POSES[pose].tilt);
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    // Turn about the open fingertip, so a turned or curled hand keeps its wrist where the open one had it.
    const turn = ([hx, hy]) => {
        const dx = hx - OPEN_TIP[0];
        const dy = hy - OPEN_TIP[1];
        return [(dx * c) - (dy * s), (dx * s) + (dy * c)];
    };
    const landmarks = handShape(pose).map(p => {
        const [hx, hy] = turn(p);
        const vx = x + (hx * HAND_SIZE);
        return {x: mirror ? 1 - vx : vx, y: y - (hy * HAND_SIZE), z: 0};
    });
    return {gesture: pose, score: 1, side: 'right', landmarks};
};

/**
 * The pointer's place on an element, as fractions of its size; null when it is outside.
 * @param {{clientX: number, clientY: number}} event A pointer event.
 * @param {{left: number, top: number, width: number, height: number}} rect The element's client rect.
 * @returns {?{x: number, y: number}} The point, each coordinate 0 … 1.
 */
export const pointerPosition = (event, rect) => {
    if (!rect.width || !rect.height) return null;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return {x, y};
};

/**
 * The gesture after the right button: the next one in MOUSE_GESTURES, skipping the fist, which the left
 * button already makes.
 * @param {string} gesture The current gesture.
 * @returns {string} The next one.
 */
export const nextGesture = gesture => {
    const cycle = MOUSE_GESTURES.filter(g => g !== 'fist');
    return cycle[(cycle.indexOf(gesture) + 1) % cycle.length];
};

/**
 * The gesture a number key picks.
 * @param {string} key A `KeyboardEvent.key`.
 * @returns {?string} The gesture, or null for any other key.
 */
export const gestureForKey = key => {
    const n = Number(key);
    return Number.isInteger(n) && n >= 1 && n <= MOUSE_GESTURES.length ? MOUSE_GESTURES[n - 1] : null;
};

/** How often the mouse hand reports, like a camera at 30 frames per second. */
const FRAME_MS = 33;

/** Frame height over frame width: camera frames are 4:3. */
const ASPECT = 0.75;

/**
 * Where each of MediaPipe's 33 pose landmarks sits, relative to the nose, for someone facing the camera
 * with the arms down: x and y both in frame widths (y down), so the figure keeps its shape on a 4:3 frame.
 * Index 2 is the person's left eye, on the viewer's right.
 */
const BODY = [
    [0, 0], [0.012, -0.02], [0.026, -0.02], [0.04, -0.02], [-0.012, -0.02], [-0.026, -0.02], [-0.04, -0.02],
    [0.06, -0.01], [-0.06, -0.01], [0.02, 0.03], [-0.02, 0.03],
    [0.12, 0.13], [-0.12, 0.13], [0.17, 0.25], [-0.17, 0.25], [0.19, 0.36], [-0.19, 0.36],
    [0.2, 0.39], [-0.2, 0.39], [0.19, 0.4], [-0.19, 0.4], [0.18, 0.38], [-0.18, 0.38],
    [0.08, 0.42], [-0.08, 0.42], [0.08, 0.62], [-0.08, 0.62], [0.08, 0.82], [-0.08, 0.82],
    [0.08, 0.85], [-0.08, 0.85], [0.1, 0.86], [-0.1, 0.86]
];
/** The head's landmarks (nose, eyes, ears, mouth), which lean and nod about the neck. */
const HEAD_POINTS = 11;
const NECK = [0, 0.1];
/** How far a nod dips the head, in frame widths. */
const NOD_DEPTH = 0.06;

/**
 * The body the pose model would report for a pointer at a point of the playground: the nose on the pointer.
 * @param {object} body Where the pointer is and what the head does.
 * @param {number} body.x Pointer x across the playground as the viewer sees it, 0 … 1.
 * @param {number} body.y Pointer y down the playground, 0 … 1.
 * @param {number} [body.tilt] How far the head leans, in degrees; + lowers the viewer's right side.
 * @param {number} [body.nod] How far through a nod the head is dipped, 0 … 1.
 * @param {?Array<{x: number, y: number}>} [body.wrists] Where the two wrists are (viewer's left first), when
 *   the arms are raised; null for arms down.
 * @param {boolean} body.mirror Whether the picture is shown mirrored.
 * @returns {{landmarks: Array<{x: number, y: number, z: number, visibility: number}>}} The pose.
 */
export const mousePose = ({x, y, tilt = 0, nod = 0, wrists = null, mirror}) => {
    const a = rad(tilt);
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const landmarks = BODY.map(([bx, by], i) => {
        let px = bx;
        let py = by;
        if (i < HEAD_POINTS) {
            py += nod * NOD_DEPTH;
            const dx = px - NECK[0];
            const dy = py - NECK[1];
            px = NECK[0] + (dx * c) - (dy * sn);
            py = NECK[1] + (dx * sn) + (dy * c);
        }
        const vx = x + px;
        const vy = y + (py / ASPECT);
        return {x: vx, y: vy, z: 0, visibility: i <= 22 ? 0.99 : 0.3};
    });
    if (wrists) {
        // Viewer's right is the person's left (even index); each arm reaches its raised hand.
        const [left, right] = wrists;
        const arm = (shoulder, elbow, wrist, hand) => {
            const s0 = landmarks[shoulder];
            landmarks[wrist] = {...landmarks[wrist], x: hand.x, y: hand.y};
            landmarks[elbow] = {...landmarks[elbow], x: (s0.x + hand.x) / 2, y: (s0.y + hand.y) / 2};
        };
        arm(11, 13, 15, right);
        arm(12, 14, 16, left);
    }
    return {landmarks: landmarks.map(p => ({...p, x: mirror ? 1 - p.x : p.x}))};
};

/** A flap of both arms with the space bar: how long it lasts and where the hands go, top to middle. */
const FLAP_MS = 350;
const FLAP_FROM = 0.15;
const FLAP_TO = 0.65;
const FLAP_X = [0.3, 0.7];

/**
 * Both hands partway through a flap, as the viewer sees them.
 * @param {number} p How far through the flap, 0 … 1.
 * @returns {Array<{x: number, y: number}>} The fingertips, viewer's left first.
 */
export const flapPoints = p => FLAP_X.map(fx => ({x: fx, y: FLAP_FROM + ((FLAP_TO - FLAP_FROM) * p)}));

/** How far a lean with the arrow keys goes, and how long a nod with the down arrow takes. */
const KEY_TILT = 25;
const NOD_MS = 400;

/**
 * Report a mouse hand over an element until stopped: one frame every FRAME_MS while the pointer is over
 * the element, and frames with no hand while it is away. While the project uses the head and body blocks,
 * the pointer moves the head instead: the arrow keys lean it (left, right) and nod it (down). The space bar
 * flaps both arms down. Keys count only while the pointer is on the playground, so typing in the blocks is
 * left alone.
 * @param {HTMLElement} element The playground the pointer moves over.
 * @param {function(object): void} onResults Called with `{hands, pose, t}` for every frame.
 * @param {function(): boolean} isMirrored Whether the picture is mirrored now.
 * @param {function(): boolean} [wantPose] Whether the project uses the head and body blocks.
 * @returns {{stop: function(): void}} Stops reporting and releases the listeners.
 */
export const trackMouse = (element, onResults, isMirrored, wantPose = () => false) => {
    let point = null;
    let held = false;
    let gesture = 'open';
    let tilt = 0;
    let nodAt = -Infinity;
    let flapAt = -Infinity;
    const onMove = e => {
        point = pointerPosition(e, element.getBoundingClientRect());
    };
    const onLeave = () => {
        point = null;
        held = false;
        tilt = 0;
    };
    const onDown = e => {
        onMove(e);
        if (e.button === 0) held = true;
    };
    const onUp = e => {
        if (e.button === 0) held = false;
    };
    const onMenu = e => {
        e.preventDefault();
        gesture = nextGesture(gesture);
    };
    const onKey = e => {
        if (!point || e.ctrlKey || e.metaKey || e.altKey) return;
        const picked = gestureForKey(e.key);
        if (picked) gesture = picked;
        else if (e.key === 'ArrowLeft') tilt = -KEY_TILT;
        else if (e.key === 'ArrowRight') tilt = KEY_TILT;
        else if (e.key === 'ArrowDown' && !e.repeat) nodAt = Date.now();
        else if (e.key === ' ' && !e.repeat) flapAt = Date.now();
        else return;
        // The page would scroll on the arrows and the space bar.
        e.preventDefault();
    };
    const onKeyUp = e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') tilt = 0;
    };
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerleave', onLeave);
    element.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    element.addEventListener('contextmenu', onMenu);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    const timer = setInterval(() => {
        const now = Date.now();
        const mirror = isMirrored();
        const body = wantPose();
        const flapping = now - flapAt < FLAP_MS;
        let hands = [];
        let wrists = null;
        if (flapping) {
            const tips = flapPoints((now - flapAt) / FLAP_MS);
            hands = tips.map(tip => mouseHand({...tip, gesture: 'open', mirror}));
            // The pose's wrists go with the hands: below the fingertips.
            wrists = tips.map(tip => ({x: tip.x, y: tip.y + (HAND_SIZE * 0.8)}));
        } else if (point && !body) {
            hands = [mouseHand({...point, gesture: held ? 'fist' : gesture, mirror})];
        }
        const nodP = (now - nodAt) / NOD_MS;
        const pose = body && point ? mousePose({
            ...point,
            tilt,
            nod: nodP >= 0 && nodP < 1 ? Math.sin(Math.PI * nodP) : 0,
            wrists,
            mirror
        }) : null;
        onResults({hands, pose, t: now});
    }, FRAME_MS);
    return {
        stop () {
            clearInterval(timer);
            element.removeEventListener('pointermove', onMove);
            element.removeEventListener('pointerleave', onLeave);
            element.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            element.removeEventListener('contextmenu', onMenu);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKeyUp);
        }
    };
};
