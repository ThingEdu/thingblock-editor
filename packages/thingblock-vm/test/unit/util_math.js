const test = require('tap').test;
const math = require('../../src/util/math-util');

test('clamp', t => {
    t.equal(math.clamp(0, 0, 10), 0);
    t.equal(math.clamp(1, 0, 10), 1);
    t.equal(math.clamp(-10, 0, 10), 0);
    t.equal(math.clamp(100, 0, 10), 10);
    t.end();
});

test('tan', t => {
    t.equal(math.tan(90), Infinity);
    t.equal(math.tan(180), 0);
    t.equal(math.tan(-90), -Infinity);
    t.equal(math.tan(33), 0.6494075932);
    t.end();
});
