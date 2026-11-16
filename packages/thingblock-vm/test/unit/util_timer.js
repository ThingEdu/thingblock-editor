const test = require('tap').test;
const Timer = require('../../src/util/timer');

// Stubbed current time
let NOW = 0;

const testNow = {
    now: () => {
        NOW += 100;
        return NOW;
    }
};

test('setTimeout / clearTimeout', t => new Promise((resolve, reject) => {
    const timer = new Timer(testNow);
    const cancelId = timer.setTimeout(() => {
        reject(new Error('Canceled task ran'));
    }, 1);
    timer.setTimeout(() => {
        resolve('Non-canceled task ran');
        t.end();
    }, 2);
    timer.clearTimeout(cancelId);
}));
