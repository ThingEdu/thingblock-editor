/**
 * The playground the Camera AI blocks draw on: named objects on the stage, two players' scores,
 * a countdown and a speech line. The extension is the source of truth; the GUI only renders the
 * state it is sent.
 *
 * Objects may carry a velocity and fall under one shared gravity; while anything moves, the
 * playground steps itself at a fixed rate and reports every step through `onChange`.
 */

import {STAGE_HEIGHT, STAGE_WIDTH} from './vision-state';

/** What an object looks like; the GUI draws each kind as a picture. */
export type ObjectKind = 'ball' | 'cricket' | 'drop' | 'basket' | 'star' | 'bomb' | 'bamboo' | 'tre';

/**
 * A bamboo is a wall of two stalks, from the top of the stage and from the bottom, with an opening between
 * them: its `y` is the middle of the opening and its `size` the opening's height. It is planted, so gravity
 * does not pull it. Every other kind is a round picture `size` wide.
 */
export const BAMBOO_WIDTH = 46;

export interface PlaygroundObject {
    name: string
    kind: ObjectKind
    x: number
    y: number
    // Width of the picture on the stage, in stage units.
    size: number
    // Velocity in stage units per second; y grows upward.
    vx: number
    vy: number
}

/** A side of the stage an object can touch. */
export type Edge = 'top' | 'bottom' | 'left' | 'right';

export const EDGES: Edge[] = ['top', 'bottom', 'left', 'right'];

export interface PlaygroundState {
    objects: PlaygroundObject[]
    scores: [number, number]
    // Seconds left on the countdown, or null when none runs.
    timeLeft: number | null
    say: string
    showScoreboard: boolean
}

/** How close a hand point has to be to an object's edge to touch it, in stage units. */
const TOUCH_MARGIN = 14;

/** How often moving objects advance; a late tick (a paused tab) is capped so nothing teleports. */
const PHYSICS_INTERVAL_MS = 1000 / 30;
const MAX_STEP_S = 0.1;

const playerIndex = (player: number) => (Math.round(player) === 2 ? 1 : 0);
// Positions stay fractional while an object moves, so slow motion adds up; they round on the way out.
const limitX = (x: number) => Math.max(-STAGE_WIDTH / 2, Math.min(STAGE_WIDTH / 2, x));
const limitY = (y: number) => Math.max(-STAGE_HEIGHT / 2, Math.min(STAGE_HEIGHT / 2, y));
const clampX = (x: number) => limitX(Math.round(x));
const clampY = (y: number) => limitY(Math.round(y));

// How far a round picture reaches, counted a little inside its drawn edge.
const roundRadius = (o: PlaygroundObject) => (o.size / 2) * 0.8;

/**
 * Whether a circle reaches an object: within a round object's picture, or on a bamboo's stalks (beside
 * its column and outside its opening).
 * @param o The object.
 * @param x The circle's centre x.
 * @param y The circle's centre y.
 * @param r The circle's radius.
 * @returns Whether they touch.
 */
const hits = (o: PlaygroundObject, x: number, y: number, r: number): boolean => {
    if (o.kind !== 'bamboo') return Math.hypot(o.x - x, o.y - y) <= (o.size / 2) + r;
    if (Math.abs(x - o.x) > (BAMBOO_WIDTH / 2) + r) return false;
    return y + r > o.y + (o.size / 2) || y - r < o.y - (o.size / 2);
};

export class Playground {
    _objects: Map<string, PlaygroundObject> = new Map();
    _scores: [number, number] = [0, 0];
    _timerEnd: number | null = null;
    _say = '';
    _showScoreboard = false;
    _now: () => number;
    _onChange: (state: PlaygroundState) => void;
    _onTimeUp: () => void;
    _timeout: ReturnType<typeof setTimeout> | null = null;
    _timerTicker: ReturnType<typeof setInterval> | null = null;
    _gravity = 0;
    _ticker: ReturnType<typeof setInterval> | null = null;
    _lastTick = 0;

    constructor (
        onChange: (state: PlaygroundState) => void,
        onTimeUp: () => void = () => {},
        now: () => number = () => Date.now()
    ) {
        this._onChange = onChange;
        this._onTimeUp = onTimeUp;
        this._now = now;
    }

    spawn (name: string, kind: ObjectKind, x: number, y: number, size: number) {
        this._objects.set(name, {name, kind, x: clampX(x), y: clampY(y), size: Math.max(8, size), vx: 0, vy: 0});
        this._changed();
        this._keepMoving();
    }

    setVelocity (name: string, vx: number, vy: number) {
        const o = this._objects.get(name);
        if (!o) return;
        o.vx = vx;
        o.vy = vy;
        this._keepMoving();
    }

    // Stage units per second squared pulling every object down; 0 turns it off.
    setGravity (g: number) {
        this._gravity = g;
        this._keepMoving();
    }

    gravity (): number {
        return this._gravity;
    }

    // Advance every moving object by `dt` seconds. An object stopped by a side of the stage loses
    // the velocity that pushed it there, so a fallen ball rests on the floor.
    step (dt: number) {
        let moved = false;
        for (const o of this._objects.values()) {
            if (this._gravity !== 0 && o.kind !== 'bamboo') o.vy -= this._gravity * dt;
            if (o.vx === 0 && o.vy === 0) continue;
            const x = limitX(o.x + (o.vx * dt));
            const y = limitY(o.y + (o.vy * dt));
            if (Math.abs(x) === STAGE_WIDTH / 2) o.vx = 0;
            if (Math.abs(y) === STAGE_HEIGHT / 2) o.vy = 0;
            moved = moved || x !== o.x || y !== o.y;
            o.x = x;
            o.y = y;
        }
        if (moved) this._changed();
    }

    _needsStepping (): boolean {
        if (this._objects.size === 0) return false;
        if (this._gravity !== 0) return true;
        for (const o of this._objects.values()) {
            if (o.vx !== 0 || o.vy !== 0) return true;
        }
        return false;
    }

    // Start the clock when something can move; it stops itself once nothing does.
    _keepMoving () {
        if (this._ticker !== null || !this._needsStepping()) return;
        this._lastTick = this._now();
        this._ticker = setInterval(() => {
            const now = this._now();
            const dt = Math.min(MAX_STEP_S, (now - this._lastTick) / 1000);
            this._lastTick = now;
            this.step(dt);
            if (!this._needsStepping()) this._stopMoving();
        }, PHYSICS_INTERVAL_MS);
    }

    _stopMoving () {
        if (this._ticker === null) return;
        clearInterval(this._ticker);
        this._ticker = null;
    }

    // Freeze every object where it is.
    _freeze () {
        this._stopMoving();
        this._gravity = 0;
        for (const o of this._objects.values()) {
            o.vx = 0;
            o.vy = 0;
        }
    }

    moveTo (name: string, x: number, y: number) {
        const o = this._objects.get(name);
        if (!o) return;
        o.x = clampX(x);
        o.y = clampY(y);
        this._changed();
    }

    remove (name: string) {
        if (this._objects.delete(name)) this._changed();
        if (!this._needsStepping()) this._stopMoving();
    }

    removeAll () {
        this._stopMoving();
        if (this._objects.size === 0) return;
        this._objects.clear();
        this._changed();
    }

    object (name: string): PlaygroundObject | null {
        return this._objects.get(name) || null;
    }

    /**
     * Whether a stage point lies within the object's picture plus a margin.
     * @param name
     * @param point
     */
    touching (name: string, point: {x: number, y: number} | null, radius = 0): boolean {
        const o = this._objects.get(name);
        if (!o || !point) return false;
        return hits(o, point.x, point.y, radius + TOUCH_MARGIN);
    }

    // Whether two objects' pictures overlap; a little forgiving, so a near miss is not a hit.
    touchingObject (a: string, b: string): boolean {
        const p = this._objects.get(a);
        const q = this._objects.get(b);
        if (!p || !q || p === q) return false;
        if (q.kind === 'bamboo') return hits(q, p.x, p.y, roundRadius(p));
        return hits(p, q.x, q.y, roundRadius(q));
    }

    // Whether the object's picture reaches a side of the stage.
    atEdge (name: string, edge: Edge): boolean {
        const o = this._objects.get(name);
        if (!o) return false;
        // A bamboo always reaches the top and the bottom; only its sides count.
        if (o.kind === 'bamboo' && (edge === 'top' || edge === 'bottom')) return false;
        const half = o.kind === 'bamboo' ? BAMBOO_WIDTH / 2 : o.size / 2;
        switch (edge) {
        case 'top': return o.y + half >= STAGE_HEIGHT / 2;
        case 'bottom': return o.y - half <= -STAGE_HEIGHT / 2;
        case 'left': return o.x - half <= -STAGE_WIDTH / 2;
        case 'right': return o.x + half >= STAGE_WIDTH / 2;
        default: return false;
        }
    }

    addScore (player: number, delta: number) {
        const i = playerIndex(player);
        this._scores[i] += delta;
        this._showScoreboard = true;
        this._changed();
    }

    setScore (player: number, value: number) {
        const i = playerIndex(player);
        this._scores[i] = value;
        this._showScoreboard = true;
        this._changed();
    }

    score (player: number): number {
        return this._scores[playerIndex(player)];
    }

    showScoreboard (show: boolean) {
        this._showScoreboard = show;
        this._changed();
    }

    startTimer (seconds: number) {
        const ms = Math.max(0, seconds) * 1000;
        this._timerEnd = this._now() + ms;
        this._showScoreboard = true;
        this._clearTimeout();
        // The GUI shows the seconds, refreshed once a second; the program hears the end through its hat.
        this._timeout = setTimeout(() => {
            this._clearTimeout();
            this._changed();
            this._onTimeUp();
        }, ms);
        this._timerTicker = setInterval(() => this._changed(), 1000);
        this._changed();
    }

    _clearTimeout () {
        if (this._timeout !== null) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }
        if (this._timerTicker !== null) {
            clearInterval(this._timerTicker);
            this._timerTicker = null;
        }
    }

    stopTimer () {
        this._clearTimeout();
        if (this._timerEnd === null) return;
        this._timerEnd = null;
        this._changed();
    }

    timeLeft (): number {
        if (this._timerEnd === null) return 0;
        return Math.max(0, Math.ceil((this._timerEnd - this._now()) / 1000));
    }

    say (text: string) {
        this._say = text;
        this._changed();
    }

    // Stop clears what a program left on screen; the objects stay, so a learner can inspect them.
    stop () {
        this._freeze();
        this._clearTimeout();
        this._timerEnd = null;
        this._say = '';
        this._changed();
    }

    // Every object, score and message goes: the project starts over.
    reset () {
        this._freeze();
        this._clearTimeout();
        this._objects.clear();
        this._scores = [0, 0];
        this._timerEnd = null;
        this._say = '';
        this._showScoreboard = false;
        this._changed();
    }

    state (): PlaygroundState {
        return {
            objects: [...this._objects.values()].map(o => ({...o, x: Math.round(o.x), y: Math.round(o.y)})),
            scores: [this._scores[0], this._scores[1]],
            timeLeft: this._timerEnd === null ? null : this.timeLeft(),
            say: this._say,
            showScoreboard: this._showScoreboard
        };
    }

    _changed () {
        this._onChange(this.state());
    }
}
