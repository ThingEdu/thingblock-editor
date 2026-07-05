const test = require('tap').test;
const Mouse = require('../../src/io/hid/mouse');
const Runtime = require('../../src/engine/runtime');

test('spec', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    t.type(m, 'object');
    t.type(m.postData, 'function');
    t.type(m.getClientX, 'function');
    t.type(m.getClientY, 'function');
    t.type(m.getScratchX, 'function');
    t.type(m.getScratchY, 'function');
    t.type(m.getIsDown, 'function');
    t.end();
});

test('mouseUp', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: -20,
        y: 10,
        isDown: false,
        canvasWidth: 480,
        canvasHeight: 360
    });
    t.equal(m.getClientX(), -20);
    t.equal(m.getClientY(), 10);
    t.equal(m.getScratchX(), -240);
    t.equal(m.getScratchY(), 170);
    t.equal(m.getIsDown(), false);
    t.end();
});

test('mouseDown', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: 9.9,
        y: 400.1,
        isDown: true,
        canvasWidth: 480,
        canvasHeight: 360
    });
    t.equal(m.getClientX(), 9.9);
    t.equal(m.getClientY(), 400.1);
    t.equal(m.getScratchX(), -230);
    t.equal(m.getScratchY(), -180);
    t.equal(m.getIsDown(), true);
    t.end();
});

test('at zoomed scale', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: 240,
        y: 540,
        canvasWidth: 960,
        canvasHeight: 720
    });
    t.equal(m.getClientX(), 240);
    t.equal(m.getClientY(), 540);
    t.equal(m.getScratchX(), -120);
    t.equal(m.getScratchY(), -90);
    t.end();
});

