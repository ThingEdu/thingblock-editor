/**
 * The latest frame of vision results, as the GUI's hand tracker reports it, and the lookups the
 * blocks make on it. Only the newest frame is kept: a block that runs late reads the present, not
 * a backlog.
 */

/** The playground is a Scratch-sized stage: x runs −240…240, y runs −180…180, origin in the middle. */
export const STAGE_WIDTH = 480;
export const STAGE_HEIGHT = 360;

/** A landmark as MediaPipe reports it: normalized to the camera frame, origin top-left. */
export interface Landmark {
    x: number
    y: number
    z?: number
    // How sure the pose model is that this point is in the picture, 0…1; hand landmarks have none.
    visibility?: number
}

/** A person's body as MediaPipe's pose landmarker reports it: 33 landmarks in its order. */
export interface Pose {
    landmarks: Landmark[]
}

/** Pose landmark indices the blocks use. */
export const POSE = {
    nose: 0,
    leftEye: 2,
    rightEye: 5,
    leftShoulder: 11,
    rightShoulder: 12,
    leftWrist: 15,
    rightWrist: 16
} as const;

/** Below this visibility a pose landmark is treated as not seen. */
const MIN_VISIBILITY = 0.5;

/** The head on the stage: where the nose is, how far it leans (degrees, + to the right), how big it looks. */
export interface Head {
    x: number
    y: number
    tilt: number
    // About half the head's width on the stage, for touching.
    radius: number
}

/** MediaPipe's canned gesture categories; `none` when it recognises nothing. */
export type Gesture = 'none' | 'fist' | 'open' | 'thumb_up' | 'thumb_down' | 'victory' | 'point_up' | 'i_love_you';

export const GESTURES: Gesture[] = ['fist', 'open', 'thumb_up', 'thumb_down', 'victory', 'point_up', 'i_love_you'];

export interface Hand {
    gesture: Gesture
    // Confidence of `gesture`, 0…1.
    score: number
    // Which of the person's hands this is, as MediaPipe labels a selfie camera.
    side: 'left' | 'right'
    // 21 landmarks in MediaPipe's hand order.
    landmarks: Landmark[]
}

export interface VisionResults {
    hands: Hand[]
    // The body, when the project uses the head and body blocks and the tracker found someone.
    pose?: Pose | null
    // The camera is shown mirrored, so x grows to the viewer's right.
    mirror: boolean
    // When the frame was captured, in ms.
    t: number
}

/** The MediaPipe category names, mapped to the gesture values the blocks use. */
export const GESTURE_BY_CATEGORY: Record<string, Gesture> = {
    None: 'none',
    Closed_Fist: 'fist',
    Open_Palm: 'open',
    Thumb_Up: 'thumb_up',
    Thumb_Down: 'thumb_down',
    Victory: 'victory',
    Pointing_Up: 'point_up',
    ILoveYou: 'i_love_you'
};

/** Hand parts the blocks name, by MediaPipe landmark index; `palm` averages the palm's corners. */
export const HAND_PART_INDEX: Record<string, number | number[]> = {
    wrist: 0,
    thumbTip: 4,
    indexTip: 8,
    middleTip: 12,
    ringTip: 16,
    pinkyTip: 20,
    palm: [0, 5, 9, 13, 17]
};

/** Which hand a block means: any hand, the first or second one seen, or the person's left or right. */
export type HandSelector = 'any' | '1' | '2' | 'left' | 'right';

export const HAND_SELECTORS: HandSelector[] = ['any', '1', '2', 'left', 'right'];

// A menu value as the block stores it (upper case, so hats can match it) to the selector it means.
export const toSelector = (value: string | number): HandSelector => {
    const v = String(value).toLowerCase();
    return (HAND_SELECTORS as string[]).includes(v) ? v as HandSelector : 'any';
};

export const toGesture = (value: string | number): Gesture => {
    const v = String(value).toLowerCase();
    return (GESTURES as string[]).includes(v) ? v as Gesture : 'none';
};

/** Results no newer than this are stale: the tracker stopped, so the blocks see no hands. */
const STALE_MS = 1000;

export class VisionState {
    _results: VisionResults | null = null;
    _cameraOn = false;
    _cameraReady = false;
    _now: () => number;

    constructor (now: () => number = () => Date.now()) {
        this._now = now;
    }

    update (results: VisionResults) {
        this._results = results;
    }

    setCamera (on: boolean, ready: boolean) {
        this._cameraOn = on;
        this._cameraReady = on && ready;
        if (!on) this._results = null;
    }

    get cameraOn () {
        return this._cameraOn;
    }

    get cameraReady () {
        return this._cameraReady;
    }

    get mirror () {
        return this._results ? this._results.mirror : true;
    }

    hands (): Hand[] {
        const r = this._results;
        if (!r || this._now() - r.t > STALE_MS) return [];
        return r.hands;
    }

    hand (selector: HandSelector): Hand | null {
        const hands = this.hands();
        switch (selector) {
        case '1': return hands[0] || null;
        case '2': return hands[1] || null;
        case 'left': return hands.find(h => h.side === 'left') || null;
        case 'right': return hands.find(h => h.side === 'right') || null;
        default: return hands[0] || null;
        }
    }

    // Hands a gesture block can match: all of them for `any`, else the one selected.
    handsMatching (selector: HandSelector): Hand[] {
        if (selector === 'any') return this.hands();
        const h = this.hand(selector);
        return h ? [h] : [];
    }

    // The body of the latest fresh frame, or null when none was tracked.
    pose (): Pose | null {
        const r = this._results;
        if (!r || !r.pose || this._now() - r.t > STALE_MS) return null;
        return r.pose;
    }

    // A pose landmark on the stage, or null when the model did not see it.
    posePoint (index: number): {x: number, y: number} | null {
        const pose = this.pose();
        const p = pose && pose.landmarks[index];
        if (!p || (p.visibility ?? 1) < MIN_VISIBILITY) return null;
        return this.toStage(p.x, p.y);
    }

    // The head on the stage, from the nose and the eyes; null when no head is seen.
    head (): Head | null {
        const nose = this.posePoint(POSE.nose);
        if (!nose) return null;
        const a = this.posePoint(POSE.leftEye);
        const b = this.posePoint(POSE.rightEye);
        if (!a || !b) return {...nose, tilt: 0, radius: 30};
        // The eye on the left of the stage to the one on the right: the right side lower means a lean right.
        const [p, q] = a.x <= b.x ? [a, b] : [b, a];
        const tilt = Math.round((Math.atan2(p.y - q.y, q.x - p.x) * 180) / Math.PI);
        return {...nose, tilt, radius: Math.max(20, Math.hypot(q.x - p.x, q.y - p.y) * 1.6)};
    }

    // The named part of a hand on the stage, or null without that hand.
    partPosition (selector: HandSelector, part: string): {x: number, y: number} | null {
        const h = this.hand(selector);
        if (!h) return null;
        const index = HAND_PART_INDEX[part] ?? HAND_PART_INDEX.indexTip;
        const indices = Array.isArray(index) ? index : [index];
        let x = 0;
        let y = 0;
        for (const i of indices) {
            const p = h.landmarks[i];
            if (!p) return null;
            x += p.x;
            y += p.y;
        }
        return this.toStage(x / indices.length, y / indices.length);
    }

    // A normalized camera point as stage coordinates, mirrored like the picture.
    toStage (nx: number, ny: number): {x: number, y: number} {
        const sx = this.mirror ? 1 - nx : nx;
        return {
            x: Math.round((sx - 0.5) * STAGE_WIDTH),
            y: Math.round((0.5 - ny) * STAGE_HEIGHT)
        };
    }
}
