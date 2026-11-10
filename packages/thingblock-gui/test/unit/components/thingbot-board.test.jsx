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

const pointsOf = path => path.getAttribute('d')
    .match(/-?[\d.]+,-?[\d.]+/g)
    .map(xy => xy.split(',').map(Number));
const labelsOf = (container, port) => [...container.querySelectorAll(`text[data-port="${port}"]`)]
    .map(t => ({name: t.lastChild.textContent, x: Number(t.getAttribute('x')), y: Number(t.getAttribute('y'))}));
const namesDown = labels => [...labels].sort((a, b) => a.y - b.y).map(l => l.name);
const namesAcross = labels => [...labels].sort((a, b) => a.x - b.x).map(l => l.name);

test('the board is labelled like the real silkscreen, top to bottom', () => {
    const {container} = renderBoard();
    expect(namesDown(labelsOf(container, 'i2c'))).toEqual(['GND', '5V', 'SDA', 'SCL']);
    expect(namesDown(labelsOf(container, 'ps2'))).toEqual(['CLK', 'ATT', 'CMD', 'DAT', 'VCC', 'GND']);
    for (let n = 1; n <= 5; n++) {
        expect(namesDown(labelsOf(container, `servo${n}`))).toEqual(['GND', '5V', `S${n}`]);
    }
    // S5's port sits at the top of the header, S1's at the bottom.
    const topOf = n => Math.min(...labelsOf(container, `servo${n}`).map(l => l.y));
    expect([5, 4, 3, 2, 1].map(topOf)).toEqual([5, 4, 3, 2, 1].map(topOf).sort((a, b) => a - b));
    // The two bottom ports, left to right.
    expect(namesAcross(labelsOf(container, 'io0'))).toEqual(['GND', '5V', 'IO0', 'IO1']);
    expect(namesAcross(labelsOf(container, 'io4'))).toEqual(['GND', '5V', 'IO4', 'IO5']);
    const titles = [...container.querySelectorAll('text[data-port] title')].map(t => t.textContent);
    expect(titles).toEqual(expect.arrayContaining(['DAT · GPIO7', 'CLK · GPIO6', 'SDA · GPIO8', 'IO5 · GPIO5']));
});

test('the OLED header reads GND, VCC, SDA, SCL left to right and each wire meets its namesake', () => {
    expect(OLED_PINS.map(([module]) => module)).toEqual(['GND', 'VCC', 'SDA', 'SCL']);
    expect(OLED_PINS.map(([, , board]) => board)).toEqual(['GND', '5V', 'SDA', 'SCL']);
    const {container} = renderBoard();
    const texts = [...container.querySelectorAll('text:not([data-port])')];
    const headerX = label => Number(texts.find(t => t.textContent === label).getAttribute('x'));
    const headerXs = ['GND', 'VCC', 'SDA', 'SCL'].map(headerX);
    expect([...headerXs].sort((a, b) => a - b)).toEqual(headerXs);
    const socketY = Object.fromEntries(labelsOf(container, 'i2c').map(l => [l.name, l.y]));
    const paths = [...container.querySelectorAll('path')]
        .filter(p => OLED_PINS.some(([, color]) => p.getAttribute('stroke') === color));
    expect(paths).toHaveLength(4);
    paths.forEach((p, i) => {
        const pts = pointsOf(p);
        const [module, , board] = OLED_PINS[i];
        expect(Math.abs(pts[0][1] - (socketY[board] - 1.5))).toBeLessThan(0.01);
        expect(Math.abs(pts[pts.length - 1][0] - headerX(module))).toBeLessThan(0.01);
    });
});

// The cable is drawn as polylines; no two wires may cross.
test('the four OLED wires never cross', () => {
    const paths = [...renderBoard().container.querySelectorAll('path')]
        .filter(p => OLED_PINS.some(([, color]) => p.getAttribute('stroke') === color));
    expect(paths).toHaveLength(4);
    const segments = paths.map(p => {
        const pts = pointsOf(p);
        return pts.slice(1).map((q, k) => [pts[k], q]);
    });
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
