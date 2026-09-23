import {test} from 'tap';
import {EventEmitter} from 'events';
import Keyboard from '../../src/io/hid/keyboard.ts';
import type {RuntimeEvents} from '../../src/engine/runtime/runtime-events.ts';

test('spec', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const k = new Keyboard(events);

    t.type(k, 'object');
    t.type(k.postData, 'function');
    t.type(k.getKeyIsDown, 'function');
    t.end();
});

test('keydown emits KEY_PRESSED', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const k = new Keyboard(events);
    const pressed: string[] = [];
    events.on('KEY_PRESSED', key => pressed.push(key));

    k.postData({key: 'a', isDown: true});
    k.postData({key: 'a', isDown: false});
    k.postData({key: 'Shift', isDown: true});
    t.strictSame(pressed, ['A']);
    t.end();
});

test('space key', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const k = new Keyboard(events);

    k.postData({
        key: ' ',
        isDown: true
    });
    t.strictSame(k._keysPressed, ['space']);
    t.equal(k.getKeyIsDown('space'), true);
    t.equal(k.getKeyIsDown('any'), true);
    t.end();
});

test('letter key', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const k = new Keyboard(events);

    k.postData({
        key: 'a',
        isDown: true
    });
    t.strictSame(k._keysPressed, ['A']);
    t.equal(k.getKeyIsDown(65), true);
    t.equal(k.getKeyIsDown('a'), true);
    t.equal(k.getKeyIsDown('A'), true);
    t.equal(k.getKeyIsDown('any'), true);
    t.end();
});

test('number key', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const k = new Keyboard(events);

    k.postData({
        key: '1',
        isDown: true
    });
    t.strictSame(k._keysPressed, ['1']);
    t.equal(k.getKeyIsDown(49), true);
    t.equal(k.getKeyIsDown('1'), true);
    t.equal(k.getKeyIsDown('any'), true);
    t.end();
});

test('non-english key', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const k = new Keyboard(events);

    k.postData({
        key: '日',
        isDown: true
    });
    t.strictSame(k._keysPressed, ['日']);
    t.equal(k.getKeyIsDown('日'), true);
    t.equal(k.getKeyIsDown('any'), true);
    t.end();
});

test('ignore modifier key', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const k = new Keyboard(events);

    k.postData({
        key: 'Shift',
        isDown: true
    });
    t.strictSame(k._keysPressed, []);
    t.equal(k.getKeyIsDown('any'), false);
    t.end();
});

test('keyup', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const k = new Keyboard(events);

    k.postData({
        key: 'ArrowLeft',
        isDown: true
    });
    k.postData({
        key: 'ArrowLeft',
        isDown: false
    });
    t.strictSame(k._keysPressed, []);
    t.equal(k.getKeyIsDown('left arrow'), false);
    t.equal(k.getKeyIsDown('any'), false);
    t.end();
});
