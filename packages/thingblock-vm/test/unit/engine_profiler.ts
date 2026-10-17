import {test} from 'tap';
import Profiler, {type ProfilerFrame} from '../../src/engine/profiler.ts';

/** A profiler whose clock returns `times` in order, collecting reported frames as plain objects. */
const setup = (t: tap.Test, times: number[] = []) => {
    const now = globalThis.performance.now;
    globalThis.performance.now = () => times.shift();
    t.teardown(() => {
        globalThis.performance.now = now;
    });
    const frames: Array<Partial<ProfilerFrame>> = [];
    const profiler = new Profiler(({id, arg, depth, count, totalTime, selfTime}) =>
        frames.push({id, arg, depth, count, totalTime, selfTime}));
    return {profiler, frames};
};

test('names get stable, distinct ids', t => {
    const a = Profiler.idByName('profiler test a');
    t.equal(Profiler.idByName('profiler test a'), a);
    t.not(Profiler.idByName('profiler test b'), a);
    t.equal(Profiler.nameById(a), 'profiler test a');
    t.equal(Profiler.nameById(-2), null);
    t.end();
});

test('nested spans report total and self time, innermost first', t => {
    const {profiler, frames} = setup(t, [0, 2, 5, 10]);
    profiler.start(1, 'outer');
    profiler.start(2);
    profiler.stop();
    profiler.stop();
    profiler.reportFrames();
    t.match(frames, [
        {id: 2, depth: 2, count: 1, totalTime: 3, selfTime: 3},
        {id: 1, arg: 'outer', depth: 1, count: 1, totalTime: 10, selfTime: 7}
    ]);
    t.strictSame(profiler.records, [], 'reporting clears the records');
    t.end();
});

test('increments and counters are reported once each, then reset', t => {
    const {profiler, frames} = setup(t);
    profiler.increment(3);
    profiler.increment(3);
    profiler.frame(4, 'arg').count += 5;
    t.equal(profiler.frame(4, 'arg'), profiler.frame(4, 'arg'));
    profiler.reportFrames();
    profiler.reportFrames();
    t.match(frames, [{id: 3, count: 2}, {id: 4, arg: 'arg', count: 5}]);
    t.end();
});

test('undecodable records throw and are dropped', t => {
    const {profiler} = setup(t);
    profiler.records.push('junk');
    t.throws(() => profiler.reportFrames(), /Unable to decode Profiler records/);
    t.strictSame(profiler.records, []);
    t.end();
});
