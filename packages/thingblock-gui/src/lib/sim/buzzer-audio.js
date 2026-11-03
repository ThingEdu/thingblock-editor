/**
 * Plays the virtual ThingBot's buzzer through the speakers. The buzzer is a passive one on PCA9685
 * channel 14: it sounds while that channel has a duty, at the chip's PWM frequency — which the music
 * blocks set to each note's pitch. A square wave is what the board drives it with.
 */

/** Buzzer channel on the PCA9685. */
export const BUZZER_CHANNEL = 14;
/** Gain of the tone; a square wave is loud, and the panel is not the only thing on the speakers. */
const VOLUME = 0.06;
/** Seconds to glide gain and pitch, so notes start and stop without clicks. */
const RAMP = 0.01;

const audioContextClass = () => (typeof window === 'undefined' ?
    null :
    window.AudioContext || window.webkitAudioContext || null);

/**
 * @param {?object} snapshot - a simulator snapshot (`pwm`, `pwmHz`, `running`).
 * @returns {number} the pitch the buzzer sounds at right now, in Hz, or 0 when it is silent.
 */
export const buzzerPitch = snapshot => {
    if (!snapshot || !snapshot.running || !snapshot.pwm) return 0;
    if (!(snapshot.pwm[BUZZER_CHANNEL] > 0)) return 0;
    return snapshot.pwmHz > 0 ? snapshot.pwmHz : 0;
};

export class BuzzerAudio {
    constructor () {
        this.context = null;
        this.oscillator = null;
        this.gain = null;
        this.hz = 0;
        this.muted = false;
    }

    /** Start the audio graph lazily: browsers only allow sound after the user has clicked something. */
    ensureGraph () {
        if (this.context) return true;
        const Context = audioContextClass();
        if (!Context) return false;
        try {
            this.context = new Context();
            this.gain = this.context.createGain();
            this.gain.gain.value = 0;
            this.gain.connect(this.context.destination);
            this.oscillator = this.context.createOscillator();
            this.oscillator.type = 'square';
            this.oscillator.connect(this.gain);
            this.oscillator.start();
        } catch (error) {
            this.context = null;
            return false;
        }
        return true;
    }

    /**
     * Sound at `hz`, or fall silent for 0.
     * @param {number} hz - the pitch.
     */
    play (hz) {
        const pitch = this.muted ? 0 : hz;
        if (pitch === this.hz) return;
        this.hz = pitch;
        if (pitch === 0 && !this.context) return;
        if (!this.ensureGraph()) return;
        const now = this.context.currentTime;
        if (this.context.state === 'suspended' && this.context.resume) this.context.resume().catch(() => {});
        if (pitch > 0) this.oscillator.frequency.setTargetAtTime(pitch, now, RAMP / 3);
        this.gain.gain.setTargetAtTime(pitch > 0 ? VOLUME : 0, now, RAMP);
    }

    stop () {
        this.play(0);
    }

    /** @param {boolean} muted - whether to keep quiet. */
    setMuted (muted) {
        this.muted = muted;
        if (muted) this.stop();
    }

    close () {
        this.stop();
        if (this.context && this.context.close) this.context.close().catch(() => {});
        this.context = null;
        this.oscillator = null;
        this.gain = null;
        this.hz = 0;
    }
}
