/**
 * Movements the Camera AI hats wait for, recognised from the stream of frames rather than from one:
 * both hands flapping down, a nod, and the head leaning to one side. Each detector is fed one frame at
 * a time with stage coordinates and the frame's time, and says when its movement just happened.
 */

interface Point {
    x: number
    y: number
}

/** How far back a flap may have started, and how far both hands must drop since, in stage units. */
const FLAP_WINDOW_MS = 400;
const FLAP_DROP = 90;
/** After a flap, the next one needs this long, so one swing of the arms counts once. */
const FLAP_REST_MS = 500;

/**
 * Both hands come down together, fast: each was in the upper half of the stage less than 0.4 s ago and
 * has dropped a quarter of the stage height since.
 */
export class FlapDetector {
    _history: {t: number, left: Point, right: Point}[] = [];
    _restUntil = 0;

    /**
     * @param t The frame's time, in ms.
     * @param hands The two hands on the stage, or null when two are not seen.
     * @returns Whether a flap ends on this frame.
     */
    update (t: number, hands: [Point, Point] | null): boolean {
        if (!hands) {
            this._history = [];
            return false;
        }
        const [left, right] = hands[0].x <= hands[1].x ? hands : [hands[1], hands[0]];
        this._history = this._history.filter(h => t - h.t <= FLAP_WINDOW_MS);
        const flapped = t >= this._restUntil && this._history.some(h =>
            h.left.y > 0 && h.right.y > 0 &&
            h.left.y - left.y >= FLAP_DROP && h.right.y - right.y >= FLAP_DROP);
        if (flapped) {
            this._restUntil = t + FLAP_REST_MS;
            this._history = [];
            return true;
        }
        this._history.push({t, left, right});
        return false;
    }
}

/** A nod goes down and comes back within this long. */
const NOD_WINDOW_MS = 1200;
/** After a nod, the next one needs this long. */
const NOD_REST_MS = 600;

/**
 * A nod: the nose drops towards the shoulders and comes back up. `drop` is measured against the head's
 * own size, so it works near the camera and far from it.
 */
export class NodDetector {
    _history: {t: number, d: number}[] = [];
    _restUntil = 0;

    /**
     * @param t The frame's time, in ms.
     * @param d How high the nose is above the shoulders (or the stage origin), in stage units; null without a head.
     * @param drop How far the nose must drop and mostly come back, in stage units.
     * @returns Whether a nod ends on this frame.
     */
    update (t: number, d: number | null, drop: number): boolean {
        if (d === null) {
            this._history = [];
            return false;
        }
        this._history = this._history.filter(h => t - h.t <= NOD_WINDOW_MS);
        this._history.push({t, d});
        if (t < this._restUntil) return false;
        // The lowest point, and the highest point before it.
        let low = 0;
        for (let i = 1; i < this._history.length; i++) {
            if (this._history[i].d < this._history[low].d) low = i;
        }
        const before = this._history.slice(0, low + 1).reduce((m, h) => Math.max(m, h.d), -Infinity);
        const min = this._history[low].d;
        if (before - min >= drop && d - min >= drop * 0.6) {
            this._restUntil = t + NOD_REST_MS;
            this._history = [];
            return true;
        }
        return false;
    }
}

/** A lean counts from this many degrees, and ends below the smaller angle, so it does not flicker. */
export const TILT_ON = 15;
const TILT_OFF = 8;

export type Lean = 'left' | 'right' | 'straight';

/** Which way the head leans, with a little hysteresis; says when a new lean starts. */
export class TiltTracker {
    lean: Lean = 'straight';

    /**
     * @param tilt The head's lean in degrees, + to the right; null without a head.
     * @returns The lean that just started, or null.
     */
    update (tilt: number | null): Lean | null {
        let next: Lean = this.lean;
        if (tilt === null) next = 'straight';
        else if (tilt >= TILT_ON) next = 'right';
        else if (tilt <= -TILT_ON) next = 'left';
        else if (Math.abs(tilt) < TILT_OFF) next = 'straight';
        const started = next !== this.lean && next !== 'straight' ? next : null;
        this.lean = next;
        return started;
    }
}
