import React from 'react';
import {render} from '@testing-library/react';
import {IntlProvider} from 'react-intl';
import SimPanel from '../../../src/components/sim-panel/sim-panel.jsx';

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
    stale: false
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
