/**
 * @file
 * Records timed and counted events in a flat array while the VM steps, cheap enough not to distort timings,
 * and reports them once per frame.
 */

let nextId = 0;
const profilerNames: Record<string, number> = {};

const START = 0;
const STOP = 1;
/** Record lengths: START, id, arg, time; STOP, time. */
const START_SIZE = 4;
const STOP_SIZE = 2;

/** One reported frame: a timed START/STOP span, or an increment or counter total. */
export class ProfilerFrame {
    id = -1;
    /** ms from START to STOP. */
    totalTime = 0;
    /** `totalTime` minus the time of deeper frames. */
    selfTime = 0;
    arg: unknown = null;
    /** Nesting depth; -1 for increments and counters. */
    depth: number;
    count = 0;

    constructor (depth: number) {
        this.depth = depth;
    }
}

export type FrameCallback = (frame: ProfilerFrame) => void;

class Profiler {
    static readonly START = START;
    static readonly STOP = STOP;

    readonly START = START;
    readonly STOP = STOP;
    records: unknown[] = [];
    /** Counts by id, reported as frames of their own. */
    increments: ProfilerFrame[] = [];
    /** Counts by id and arg, from `frame`. */
    counters: ProfilerFrame[] = [];
    /** A frame whose count calls can be discarded, for callers that skip counting. */
    nullFrame = new ProfilerFrame(-1);
    /** Frames reused across reports, one per depth. */
    _stack = [new ProfilerFrame(0)];
    onFrame: FrameCallback;

    constructor (onFrame: FrameCallback = () => {}) {
        this.onFrame = onFrame;
    }

    start (id: number, arg?: unknown) {
        this.records.push(START, id, arg, globalThis.performance.now());
    }

    stop () {
        this.records.push(STOP, globalThis.performance.now());
    }

    increment (id: number) {
        if (!this.increments[id]) {
            this.increments[id] = new ProfilerFrame(-1);
            this.increments[id].id = id;
        }
        this.increments[id].count += 1;
    }

    /** The counter for `id` and `arg`; callers add to its `count`. */
    frame (id: number, arg: unknown): ProfilerFrame {
        let counter = this.counters.find(frame => frame.id === id && frame.arg === arg);
        if (!counter) {
            counter = new ProfilerFrame(-1);
            counter.id = id;
            counter.arg = arg;
            this.counters.push(counter);
        }
        return counter;
    }

    /** Decodes the records into frames for `onFrame`, then the non-zero increments and counters, and resets. */
    reportFrames () {
        const stack = this._stack;
        let depth = 1;
        const records = this.records;
        for (let i = 0; i < records.length;) {
            if (records[i] === START) {
                if (depth >= stack.length) {
                    stack.push(new ProfilerFrame(depth));
                }
                const frame = stack[depth++];
                frame.id = records[i + 1] as number;
                frame.arg = records[i + 2];
                // Holds the start time until STOP turns it into the duration
                frame.totalTime = records[i + 3] as number;
                // Deeper frames subtract their time; STOP adds this frame's total
                frame.selfTime = 0;
                i += START_SIZE;
            } else if (records[i] === STOP) {
                const frame = stack[--depth];
                frame.totalTime = (records[i + 1] as number) - frame.totalTime;
                frame.selfTime += frame.totalTime;
                stack[depth - 1].selfTime -= frame.totalTime;
                frame.count = 1;
                this.onFrame(frame);
                i += STOP_SIZE;
            } else {
                this.records.length = 0;
                throw new Error('Unable to decode Profiler records.');
            }
        }

        for (const frame of [...this.increments, ...this.counters]) {
            if (frame && frame.count > 0) {
                this.onFrame(frame);
                frame.count = 0;
            }
        }
        this.records.length = 0;
    }

    idByName (name: string): number {
        return Profiler.idByName(name);
    }

    nameById (id: number): string | null {
        return Profiler.nameById(id);
    }

    /** A process-wide id for `name`, assigned on first use. */
    static idByName (name: string): number {
        if (typeof profilerNames[name] !== 'number') {
            profilerNames[name] = nextId++;
        }
        return profilerNames[name];
    }

    static nameById (id: number): string | null {
        return Object.keys(profilerNames).find(name => profilerNames[name] === id) ?? null;
    }

    /** Profiling needs a browser, for `window.performance`. */
    static available (): boolean {
        return typeof window === 'object' && typeof window.performance !== 'undefined';
    }
}

export default Profiler;
