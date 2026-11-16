const test = require('tap').test;
const color = require('../../src/util/color');

test('decimalToRgb', t => {
    t.same(color.decimalToRgb(0), {a: 255, r: 0, g: 0, b: 0});
    t.same(color.decimalToRgb(1), {a: 255, r: 0, g: 0, b: 1});
    t.same(color.decimalToRgb(16777215), {a: 255, r: 255, g: 255, b: 255});
    t.same(color.decimalToRgb(-16777215), {a: 255, r: 0, g: 0, b: 1});
    t.same(color.decimalToRgb(99999999), {a: 5, r: 245, g: 224, b: 255});
    t.end();
});

test('hexToRgb', t => {
    t.same(color.hexToRgb('#000'), {r: 0, g: 0, b: 0});
    t.same(color.hexToRgb('#000000'), {r: 0, g: 0, b: 0});
    t.same(color.hexToRgb('#fff'), {r: 255, g: 255, b: 255});
    t.same(color.hexToRgb('#ffffff'), {r: 255, g: 255, b: 255});
    t.same(color.hexToRgb('#0fa'), {r: 0, g: 255, b: 170});
    t.same(color.hexToRgb('#00ffaa'), {r: 0, g: 255, b: 170});

    t.same(color.hexToRgb('000'), {r: 0, g: 0, b: 0});
    t.same(color.hexToRgb('fff'), {r: 255, g: 255, b: 255});
    t.same(color.hexToRgb('00ffaa'), {r: 0, g: 255, b: 170});

    t.same(color.hexToRgb('0'), null);
    t.same(color.hexToRgb('hello world'), null);

    t.end();
});
