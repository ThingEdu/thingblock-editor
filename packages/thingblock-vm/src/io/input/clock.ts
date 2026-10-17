import Timer from '../../util/timer';

/** The project timer behind the "timer" reporter; pausable, and reset by the green flag. */
class Clock {
    _projectTimer: Timer;
    _pausedTime: number | null = null;
    _paused = false;

    /** `stepClock` reads the runtime's per-step time, so the timer only advances between steps. */
    constructor (stepClock: {now (): number}) {
        this._projectTimer = new Timer(stepClock);
        this._projectTimer.start();
    }

    projectTimer (): number {
        if (this._paused) {
            return this._pausedTime / 1000;
        }
        return this._projectTimer.timeElapsed() / 1000;
    }

    pause () {
        this._paused = true;
        this._pausedTime = this._projectTimer.timeElapsed();
    }

    resume () {
        this._paused = false;
        const dt = this._projectTimer.timeElapsed() - this._pausedTime;
        this._projectTimer.startTime += dt;
    }

    resetProjectTimer () {
        this._projectTimer.start();
    }
}

export default Clock;
