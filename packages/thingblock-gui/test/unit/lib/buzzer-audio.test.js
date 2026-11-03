import {BuzzerAudio, buzzerPitch} from '../../../src/lib/sim/buzzer-audio';

const param = () => {
    const p = {value: 0};
    p.setTargetAtTime = jest.fn(v => {
        p.value = v;
    });
    return p;
};

class FakeContext {
    constructor () {
        FakeContext.instances.push(this);
        this.currentTime = 0;
        this.state = 'running';
        this.destination = {};
        this.close = jest.fn(() => Promise.resolve());
    }
    createGain () {
        this.gainNode = {
            gain: param(),
            connect: jest.fn()
        };
        return this.gainNode;
    }
    createOscillator () {
        this.osc = {
            frequency: param(),
            connect: jest.fn(),
            start: jest.fn(),
            type: ''
        };
        return this.osc;
    }
}
FakeContext.instances = [];

const pwm = buzzerDuty => {
    const channels = new Array(16).fill(0);
    channels[14] = buzzerDuty;
    return channels;
};

beforeEach(() => {
    FakeContext.instances = [];
    window.AudioContext = FakeContext;
});
afterEach(() => {
    delete window.AudioContext;
});

test('the buzzer sounds at the PWM frequency only while its channel is on and the program runs', () => {
    expect(buzzerPitch({running: true, pwm: pwm(2048), pwmHz: 440})).toBe(440);
    expect(buzzerPitch({running: true, pwm: pwm(0), pwmHz: 440})).toBe(0);
    expect(buzzerPitch({running: false, pwm: pwm(2048), pwmHz: 440})).toBe(0); // paused or reset
    expect(buzzerPitch(null)).toBe(0);
});

test('plays a square wave at the note\'s pitch and falls silent on 0', () => {
    const audio = new BuzzerAudio();
    audio.play(0);
    expect(FakeContext.instances).toHaveLength(0); // no audio context until there is something to play
    audio.play(523);
    const ctx = FakeContext.instances[0];
    expect(ctx.osc.type).toBe('square');
    expect(ctx.osc.frequency.value).toBe(523);
    expect(ctx.gainNode.gain.value).toBeGreaterThan(0);
    audio.stop();
    expect(ctx.gainNode.gain.value).toBe(0);
});

test('muting silences it and keeps it silent', () => {
    const audio = new BuzzerAudio();
    audio.play(440);
    const ctx = FakeContext.instances[0];
    audio.setMuted(true);
    expect(ctx.gainNode.gain.value).toBe(0);
    audio.play(660);
    expect(ctx.gainNode.gain.value).toBe(0);
    audio.setMuted(false);
    audio.play(660);
    expect(ctx.gainNode.gain.value).toBeGreaterThan(0);
});

test('without Web Audio it does nothing instead of failing', () => {
    delete window.AudioContext;
    const audio = new BuzzerAudio();
    expect(() => audio.play(440)).not.toThrow();
});
