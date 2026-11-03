import React from 'react';
import {fireEvent, render} from '@testing-library/react';
import {IntlProvider} from 'react-intl';
import SimPanel from '../../../src/components/sim-panel/sim-panel.jsx';
import {MM, boardExtent, oledActiveArea} from '../../../src/components/sim-panel/thingbot-board.jsx';

const noop = () => {};
const wrapper = ({children}) => <IntlProvider locale="en">{children}</IntlProvider>;
const renderPanel = ui => render(ui, {wrapper});
const props = {
    distance: 100,
    ps2Held: {},
    onDistanceChange: noop,
    onPs2Change: noop,
    problems: [],
    speed: 1,
    switchPressed: false,
    onRun: noop,
    onPause: noop,
    onStep: noop,
    onReset: noop,
    onSpeedChange: noop,
    onSwitchChange: noop,
    stale: false,
    usesOled: true
};

// jsdom has no 2D canvas; record what the panel paints instead.
let painted;
beforeEach(() => {
    painted = [];
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
        createImageData: (w, h) => ({data: new Uint8ClampedArray(w * h * 4)}),
        putImageData: image => painted.push(image.data.some((v, i) => i % 4 !== 3 && v !== 0) ? 'lit' : 'dark')
    }));
});
afterEach(() => jest.restoreAllMocks());

const lit = () => {
    const frame = new Uint8Array(128 * 8);
    frame[0] = 0xff;
    return {width: 128, height: 64, frame};
};
const snapshot = oled => ({t: 0, running: false, pwm: [], oled});

test('blanks the display when the program has no OLED, instead of keeping the last frame', () => {
    const {rerender} = renderPanel(<SimPanel
        {...props}
        snapshot={snapshot(lit())}
    />);
    expect(painted).toEqual(['lit']);
    rerender(<SimPanel
        {...props}
        snapshot={snapshot(null)}
    />);
    expect(painted).toEqual(['lit', 'dark']);
});

test('blanks the display when there is no snapshot yet (after a reset)', () => {
    const {rerender} = renderPanel(<SimPanel
        {...props}
        snapshot={snapshot(lit())}
    />);
    rerender(<SimPanel
        {...props}
        snapshot={null}
    />);
    expect(painted).toEqual(['lit', 'dark']);
});

test('draws no display module when the program does not use one', () => {
    const {container} = renderPanel(<SimPanel
        {...props}
        snapshot={snapshot(null)}
        usesOled={false}
    />);
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.textContent).not.toContain('OLED');
});

test('draws the display module from the code before the first run', () => {
    const {container} = renderPanel(<SimPanel
        {...props}
        snapshot={null}
    />);
    expect(container.textContent).toContain('0.96" OLED 128×64');
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
});

test('the zoom button shows an enlarged copy painted with the same frame', () => {
    const {getByText, container} = renderPanel(<SimPanel
        {...props}
        snapshot={snapshot(lit())}
    />);
    painted = [];
    fireEvent.click(getByText('Zoom the display'));
    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    expect(painted).toEqual(['lit', 'lit']);
    fireEvent.click(getByText('Hide the zoomed display'));
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
});

test('the display is drawn to the board\'s scale: a 0.96" module, its pixels over the active area', () => {
    // 2.54 mm header pitch is the scale; the active area of a 0.96" glass is 21.744 × 10.864 mm.
    const active = oledActiveArea(64);
    expect(active.width / MM).toBeCloseTo(21.744, 3);
    expect(active.height / MM).toBeCloseTo(10.864, 3);
    const extent = boardExtent(true);
    expect(active.x + active.width).toBeLessThan(extent.width);
    expect(active.y + active.height).toBeLessThan(extent.height);
    const {container} = renderPanel(<SimPanel
        {...props}
        snapshot={snapshot(lit())}
    />);
    const canvas = container.querySelector('canvas');
    expect(parseFloat(canvas.style.width)).toBeCloseTo((active.width / extent.width) * 100, 3);
    expect(parseFloat(canvas.style.left)).toBeCloseTo((active.x / extent.width) * 100, 3);
});
