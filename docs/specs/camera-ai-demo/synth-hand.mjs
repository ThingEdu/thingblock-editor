// Generates a looping synthetic hand (21 MediaPipe landmarks per frame) for the Camera AI replay source.
// No photo or video of anyone: the hand is built from joint angles and moved along a path.
// Usage: node synth-hand.mjs <out.json>
import fs from 'node:fs';

const FPS = 30;
const SECONDS = 16;

// Finger bases relative to the wrist (hand space: x right, y up, in hand lengths), and segment lengths.
const FINGERS = [
    {base: [-0.30, 0.25], dir: -55, segs: [0.22, 0.18, 0.15], idx: [1, 2, 3, 4]}, // thumb
    {base: [-0.16, 0.62], dir: -8, segs: [0.30, 0.18, 0.15], idx: [5, 6, 7, 8]}, // index
    {base: [0.00, 0.66], dir: 0, segs: [0.32, 0.20, 0.16], idx: [9, 10, 11, 12]}, // middle
    {base: [0.15, 0.62], dir: 8, segs: [0.30, 0.18, 0.15], idx: [13, 14, 15, 16]}, // ring
    {base: [0.28, 0.54], dir: 16, segs: [0.24, 0.15, 0.13], idx: [17, 18, 19, 20]} // pinky
];

// How bent each finger is (0 straight … 1 fully curled), per gesture, thumb first.
const POSES = {
    open: [0, 0, 0, 0, 0],
    fist: [0.8, 1, 1, 1, 1],
    victory: [0.8, 0, 0, 1, 1],
    point_up: [0.8, 0, 1, 1, 1],
    thumb_up: [0, 1, 1, 1, 1],
    i_love_you: [0, 0, 1, 1, 0]
};

// The script of the loop: which gesture, for how long.
const SCRIPT = [
    ['point_up', 4], ['open', 3], ['fist', 2], ['victory', 3], ['open', 2], ['thumb_up', 2]
];

const rad = d => (d * Math.PI) / 180;

const handLandmarks = (cx, cy, size, tilt, bend) => {
    const pts = new Array(21);
    const toFrame = ([hx, hy]) => {
        const c = Math.cos(rad(tilt));
        const s = Math.sin(rad(tilt));
        const x = (hx * c) - (hy * s);
        const y = (hx * s) + (hy * c);
        return {x: cx + (x * size), y: cy - (y * size), z: 0};
    };
    pts[0] = toFrame([0, 0]);
    FINGERS.forEach((f, i) => {
        let [x, y] = f.base;
        let angle = 90 - f.dir; // pointing up, spread a little
        pts[f.idx[0]] = toFrame([x, y]);
        f.segs.forEach((len, k) => {
            // Seen from the front, a curled finger folds back down over the palm and looks shorter;
            // the thumb folds across the palm instead.
            if (i === 0) angle -= bend[i] * 55;
            else if (k > 0) angle += bend[i] * 80;
            const shown = len * (1 - (0.45 * bend[i]));
            x += shown * Math.cos(rad(angle));
            y += shown * Math.sin(rad(angle));
            pts[f.idx[k + 1]] = toFrame([x, y]);
        });
    });
    return pts;
};

const frames = [];
const total = FPS * SECONDS;
const scriptLength = SCRIPT.reduce((n, [, s]) => n + s, 0);
for (let n = 0; n < total; n++) {
    const t = n / FPS;
    let left = t % scriptLength;
    let gesture = SCRIPT[0][0];
    for (const [g, s] of SCRIPT) {
        if (left < s) {
            gesture = g;
            break;
        }
        left -= s;
    }
    // A slow figure-eight over the frame, so the hand visits every part of the playground.
    const cx = 0.5 + (0.3 * Math.sin((2 * Math.PI * t) / 8));
    const cy = 0.55 + (0.22 * Math.sin((4 * Math.PI * t) / 8));
    const tilt = 12 * Math.sin((2 * Math.PI * t) / 5);
    frames.push({
        dt: Math.round(1000 / FPS),
        hands: [{
            gesture,
            score: 0.9,
            side: 'right',
            landmarks: handLandmarks(cx, cy, 0.22, tilt, POSES[gesture])
        }]
    });
}
fs.writeFileSync(process.argv[2], JSON.stringify(frames));
console.log(`${frames.length} frames, ${SECONDS}s`);
