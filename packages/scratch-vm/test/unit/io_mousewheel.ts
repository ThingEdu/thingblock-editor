import {test} from 'tap';
import MouseWheel from '../../src/io/hid/mouse-wheel.ts';
import type {HatMatchFields} from '../../src/engine/runtime.ts';

test('blocks activated by scrolling', t => {
    let started: [string, HatMatchFields | undefined] | null = null;
    const mw = new MouseWheel({
        startHats: (opcode, fields) => {
            started = [opcode, fields];
            return [];
        }
    });

    mw.postData({deltaY: -1});
    t.strictSame(started, ['event_whenkeypressed', {KEY_OPTION: 'up arrow'}]);

    mw.postData({deltaY: +1});
    t.strictSame(started, ['event_whenkeypressed', {KEY_OPTION: 'down arrow'}]);

    started = null;
    mw.postData({deltaY: 0});
    t.equal(started, null);
    t.end();
});
