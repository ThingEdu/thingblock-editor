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

test('the controls carry icons, labels and tooltips; Run is the filled main action', () => {
    const {getByRole} = renderPanel(<SimPanel
        {...props}
        snapshot={null}
    />);
    for (const [name, tip] of [
        ['Run', 'Run the program on the virtual board'],
        ['Step', 'Run one block and stop'],
        ['Reset', 'Restart the virtual board from power-on']
    ]) {
        const button = getByRole('button', {name});
        expect(button.getAttribute('title')).toBe(tip);
        expect(button.querySelector('svg')).not.toBeNull();
    }
    expect(getByRole('button', {name: 'Run'}).dataset.variant).toBe('primary');
    expect(getByRole('button', {name: 'Step'}).dataset.variant).toBe('secondary');
});

test('while running, the main action is Pause', () => {
    const {getByRole, queryByRole} = renderPanel(<SimPanel
        {...props}
        snapshot={{t: 0, running: true, pwm: [], oled: null}}
    />);
    expect(getByRole('button', {name: 'Pause'}).dataset.variant).toBe('primary');
    expect(queryByRole('button', {name: 'Run'})).toBeNull();
    expect(getByRole('button', {name: 'Step'}).disabled).toBe(true);
});

test('with the code pane folded the panel takes the freed room', () => {
    const {container, rerender} = renderPanel(<SimPanel
        {...props}
        roomy
        snapshot={null}
    />);
    expect(container.firstChild.dataset.roomy).toBe('true');
    rerender(<SimPanel
        {...props}
        roomy={false}
        snapshot={null}
    />);
    expect(container.firstChild.dataset.roomy).toBe('false');
});

test('an error from the last run is shown without locking Run, Step or Reset', () => {
    const {getByRole, getByText} = renderPanel(<SimPanel
        {...props}
        runError="Unexpected token"
        snapshot={null}
    />);
    expect(getByText('Unexpected token')).toBeTruthy();
    for (const name of ['Run', 'Step', 'Reset']) {
        expect(getByRole('button', {name}).disabled).toBe(false);
    }
});

test('says the simulator was restarted after it stopped responding', () => {
    const {getByText, getByRole} = renderPanel(<SimPanel
        {...props}
        restarted
        snapshot={null}
    />);
    expect(getByText(/stopped responding and was restarted/)).toBeTruthy();
    expect(getByRole('button', {name: 'Run'}).disabled).toBe(false);
});

test('draws the board at one scale whether or not the display is shown', () => {
    // The drawing's width is a share (--part) of the room the board-and-display drawing gets, so the board
    // does not grow when the display goes away and shrink when it comes back.
    const scale = usesOled => {
        const {container, unmount} = renderPanel(<SimPanel
            {...props}
            snapshot={null}
            usesOled={usesOled}
        />);
        const drawing = container.querySelector('[style*="--part"]');
        const part = Number(drawing.style.getPropertyValue('--part'));
        const aspect = Number(drawing.style.getPropertyValue('--aspect'));
        unmount();
        return {perUnit: part / boardExtent(usesOled).width, aspect};
    };
    const withOled = scale(true);
    const without = scale(false);
    expect(without.perUnit).toBeCloseTo(withOled.perUnit, 10);
    // The room is sized from the widest drawing either way.
    expect(without.aspect).toBeCloseTo(withOled.aspect, 10);
});
