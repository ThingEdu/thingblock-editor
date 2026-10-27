import {test} from 'tap';
import Clock from '../../src/io/input/clock.ts';

const newClock = () => {
    const stepClock = {ms: 1000, now: () => stepClock.ms};
    return {stepClock, c: new Clock(stepClock)};
};

test('the timer reads the step clock', t => {
    const {stepClock, c} = newClock();
    t.equal(c.projectTimer(), 0);
    stepClock.ms += 1500;
    t.equal(c.projectTimer(), 1.5);
    t.end();
});

test('pause holds the time and resume continues from it', t => {
    const {stepClock, c} = newClock();
    stepClock.ms += 1000;
    c.pause();
    stepClock.ms += 5000;
    t.equal(c.projectTimer(), 1);

    c.resume();
    t.equal(c.projectTimer(), 1);
    stepClock.ms += 500;
    t.equal(c.projectTimer(), 1.5);
    t.end();
});

test('resetProjectTimer starts from zero', t => {
    const {stepClock, c} = newClock();
    stepClock.ms += 2000;
    c.resetProjectTimer();
    t.equal(c.projectTimer(), 0);
    t.end();
});
