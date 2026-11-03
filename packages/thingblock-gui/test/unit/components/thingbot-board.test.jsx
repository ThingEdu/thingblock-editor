import React from 'react';
import {render} from '@testing-library/react';
import {IntlProvider} from 'react-intl';
import viMessages from '../../../src/locales/vi.json';
import ThingBotBoard, {OLED_PINS} from '../../../src/components/sim-panel/thingbot-board.jsx';

const noop = () => {};
const renderBoard = ({pwm = new Array(16).fill(0), pwmHz = 0, oledRows = 64} = {}) => render(
    <IntlProvider
        locale="vi"
        messages={viMessages}
    >
        <ThingBotBoard
            oledRows={oledRows}
            pwm={pwm}
            pwmHz={pwmHz}
            switchLabel="SW"
            switchPressed={false}
            onPress={noop}
            onRelease={noop}
        />
    </IntlProvider>
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

test('every part says its state in words with its unit when hovered', () => {
    const pwm = new Array(16).fill(0);
    pwm[15] = 4096; // L1 full
    pwm[13] = 2048; // L2 half
    pwm[3] = 2048; // M1 channel B: forward at 50 %
    pwm[14] = 2048; // buzzer
    pwm[12] = 307; // S1 at 90°
    const {container} = renderBoard({pwm, pwmHz: 440, oledRows: null});
    const titles = [...container.querySelectorAll('title')].map(t => t.textContent);
    expect(titles).toEqual(expect.arrayContaining([
        'Đèn L1: sáng, độ sáng 100%',
        'Đèn L2: sáng, độ sáng 50%',
        'Động cơ M1: tiến, 50% tốc độ',
        'Động cơ M2: dừng',
        'Servo S1: góc 90°',
        'Servo S2: chưa đặt góc',
        'Còi: đang kêu 440 Hz'
    ]));
    const texts = [...container.querySelectorAll('text')].map(t => t.textContent);
    expect(texts).toEqual(expect.arrayContaining(['L1 100%', 'L2 50%', '440 Hz']));
});
