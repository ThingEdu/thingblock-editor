import React from 'react';
import {render} from '@testing-library/react';
import ThingBotBoard, {OLED_PINS} from '../../../src/components/sim-panel/thingbot-board.jsx';

const renderBoard = () => render(
    <ThingBotBoard
        oledRows={64}
        pwm={new Array(16).fill(0)}
        switchLabel="SW"
        switchPressed={false}
        onPress={() => {}}
        onRelease={() => {}}
    />
);

test('the OLED header reads GND, VCC, SDA, SCL left to right; the I2C socket GND, 5V, SDA, SCL bottom up', () => {
    expect(OLED_PINS.map(([module]) => module)).toEqual(['GND', 'VCC', 'SDA', 'SCL']);
    expect(OLED_PINS.map(([, , board]) => board)).toEqual(['GND', '5V', 'SDA', 'SCL']);
    const texts = [...renderBoard().container.querySelectorAll('text')];
    const at = (label, axis) => texts.filter(t => t.textContent === label).map(t => Number(t.getAttribute(axis)));
    // Socket labels: right-aligned beside the socket (text-anchor end). Module labels: centred on the header.
    const socket = label => texts.find(t => t.textContent === label && t.getAttribute('text-anchor') === 'end');
    const socketYs = ['GND', '5V', 'SDA', 'SCL'].map(l => Number(socket(l).getAttribute('y')));
    expect([...socketYs].sort((a, b) => b - a)).toEqual(socketYs); // bottom up
    const headerXs = ['VCC', 'SDA', 'SCL'].map(l => Math.max(...at(l, 'x')));
    expect([...headerXs].sort((a, b) => a - b)).toEqual(headerXs); // left to right
});

// The cable is drawn as polylines (the curve's control points sit on the same lines); no two may cross.
test('the four OLED wires never cross', () => {
    const paths = [...renderBoard().container.querySelectorAll('path')]
        .filter(p => OLED_PINS.some(([, color]) => p.getAttribute('stroke') === color));
    expect(paths).toHaveLength(4);
    const points = paths.map(p => (p.getAttribute('d').match(/-?[\d.]+,-?[\d.]+/g) || [])
        .map(xy => xy.split(',').map(Number)));
    // M start, C c1 c2 end(bend,over), L (px,over), L (px,headerY): segments start→(bend,start.y)→end→…
    const segments = points.map(([start, , c2, end, l1, l2]) => [
        [start, [c2[0], start[1]]], [[c2[0], start[1]], end], [end, l1], [l1, l2]
    ]);
    const cross = ([a, b], [c, d]) => {
        const o = (p, q, r) => Math.sign(((q[0] - p[0]) * (r[1] - p[1])) - ((q[1] - p[1]) * (r[0] - p[0])));
        return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
    };
    for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
            for (const s of segments[i]) {
                for (const t of segments[j]) expect(cross(s, t)).toBe(false);
            }
        }
    }
});
