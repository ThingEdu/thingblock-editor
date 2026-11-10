/**
 * The playground the Camera AI blocks draw on: named objects on the stage, two players' scores,
 * a countdown and a speech line. The extension is the source of truth; the GUI only renders the
 * state it is sent.
 */

import {STAGE_HEIGHT, STAGE_WIDTH} from './vision-state';

/** What an object looks like; the GUI draws each kind as a picture. */
export type ObjectKind = 'ball' | 'cricket' | 'drop' | 'basket' | 'star' | 'bomb';

export interface PlaygroundObject {
    name: string
    kind: ObjectKind
    x: number
    y: number
    // Width of the picture on the stage, in stage units.
    size: number
}

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

const playerIndex = (player: number) => (Math.round(player) === 2 ? 1 : 0);
const clampX = (x: number) => Math.max(-STAGE_WIDTH / 2, Math.min(STAGE_WIDTH / 2, Math.round(x)));
const clampY = (y: number) => Math.max(-STAGE_HEIGHT / 2, Math.min(STAGE_HEIGHT / 2, Math.round(y)));

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
        this._objects.set(name, {name, kind, x: clampX(x), y: clampY(y), size: Math.max(8, size)});
        this._changed();
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
    }

    removeAll () {
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
    touching (name: string, point: {x: number, y: number} | null): boolean {
        const o = this._objects.get(name);
        if (!o || !point) return false;
        const reach = (o.size / 2) + TOUCH_MARGIN;
        return Math.hypot(o.x - point.x, o.y - point.y) <= reach;
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
        // The GUI shows the seconds; the program hears the end through its hat.
        this._timeout = setTimeout(() => {
            this._timeout = null;
            this._changed();
            this._onTimeUp();
        }, ms);
        this._changed();
    }

    _clearTimeout () {
        if (this._timeout !== null) {
            clearTimeout(this._timeout);
            this._timeout = null;
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

    // True once the countdown has run out, until the next timer starts.
    timeUp (): boolean {
        return this._timerEnd !== null && this._now() >= this._timerEnd;
    }

    say (text: string) {
        this._say = text;
        this._changed();
    }

    // Stop clears what a program left on screen; the objects stay, so a learner can inspect them.
    stop () {
        this._clearTimeout();
        this._timerEnd = null;
        this._say = '';
        this._changed();
    }

    // Every object, score and message goes: the project starts over.
    reset () {
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
            objects: [...this._objects.values()].map(o => ({...o})),
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
