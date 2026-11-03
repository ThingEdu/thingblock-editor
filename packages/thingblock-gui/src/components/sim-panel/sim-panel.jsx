import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import styles from './sim-panel.css';
import ThingBotBoard, {boardExtent, oledActiveArea} from './thingbot-board.jsx';

const messages = defineMessages({
    title: {
        id: 'gui.simPanel.title',
        defaultMessage: 'Simulator',
        description: 'Title of the device panel section that runs the program on a virtual board'
    },
    run: {
        id: 'gui.simPanel.run',
        defaultMessage: 'Run',
        description: 'Button that runs the program on the virtual board'
    },
    pause: {
        id: 'gui.simPanel.pause',
        defaultMessage: 'Pause',
        description: 'Button that pauses the program on the virtual board'
    },
    step: {
        id: 'gui.simPanel.step',
        defaultMessage: 'Step',
        description: 'Button that runs one block of the program on the virtual board'
    },
    reset: {
        id: 'gui.simPanel.reset',
        defaultMessage: 'Reset',
        description: 'Button that restarts the virtual board from power-on'
    },
    runTip: {
        id: 'gui.simPanel.runTip',
        defaultMessage: 'Run the program on the virtual board',
        description: 'Tooltip of the button that runs the program on the virtual board'
    },
    pauseTip: {
        id: 'gui.simPanel.pauseTip',
        defaultMessage: 'Pause the program; Step then runs one block at a time',
        description: 'Tooltip of the button that pauses the program on the virtual board'
    },
    stepTip: {
        id: 'gui.simPanel.stepTip',
        defaultMessage: 'Run one block and stop',
        description: 'Tooltip of the button that runs one block of the program on the virtual board'
    },
    resetTip: {
        id: 'gui.simPanel.resetTip',
        defaultMessage: 'Restart the virtual board from power-on',
        description: 'Tooltip of the button that restarts the virtual board'
    },
    mute: {
        id: 'gui.simPanel.mute',
        defaultMessage: 'Mute',
        description: 'Button that silences the virtual buzzer'
    },
    muteTip: {
        id: 'gui.simPanel.muteTip',
        defaultMessage: 'Turn off the buzzer\'s sound on the computer',
        description: 'Tooltip of the button that silences the virtual buzzer'
    },
    unmute: {
        id: 'gui.simPanel.unmute',
        defaultMessage: 'Sound',
        description: 'Button that turns the virtual buzzer\'s sound back on'
    },
    unmuteTip: {
        id: 'gui.simPanel.unmuteTip',
        defaultMessage: 'Play the buzzer\'s notes on the computer\'s speakers',
        description: 'Tooltip of the button that turns the virtual buzzer\'s sound back on'
    },
    speedTip: {
        id: 'gui.simPanel.speedTip',
        defaultMessage: 'Simulation speed',
        description: 'Tooltip of the dropdown that sets how fast the virtual board runs'
    },
    switchLabel: {
        id: 'gui.simPanel.switch',
        defaultMessage: 'SW (hold)',
        description: 'Label of the virtual push button; it stays pressed while held'
    },
    stale: {
        id: 'gui.simPanel.stale',
        defaultMessage: 'The blocks changed. Press Run to start the new program.',
        description: 'Shown when the program on the virtual board no longer matches the blocks'
    },
    halted: {
        id: 'gui.simPanel.halted',
        defaultMessage: 'The board stopped: {reason}',
        description: 'Shown when the virtual board resets on an error, such as dividing by zero'
    },
    distance: {
        id: 'gui.simPanel.distance',
        defaultMessage: 'Obstacle distance',
        description: 'Label of the slider that sets how far an obstacle is from the virtual distance sensor'
    },
    zoomOled: {
        id: 'gui.simPanel.zoomOled',
        defaultMessage: 'Zoom the display',
        description: 'Button that shows the virtual OLED display enlarged under the board'
    },
    unzoomOled: {
        id: 'gui.simPanel.unzoomOled',
        defaultMessage: 'Hide the zoomed display',
        description: 'Button that hides the enlarged copy of the virtual OLED display'
    },
    restarted: {
        id: 'gui.simPanel.restarted',
        defaultMessage: 'The simulator stopped responding and was restarted. Press Run to start again.',
        description: 'Shown when the virtual board hung (a program that never gives control back) and was replaced'
    },
    gamepad: {
        id: 'gui.simPanel.gamepad',
        defaultMessage: 'PS2 gamepad (hold a button)',
        description: 'Label of the virtual PS2 gamepad; a button stays pressed while held'
    }
});

const SPEEDS = [1, 10, 100];

/* Control icons, 24-unit boxes drawn in the button's text colour. */
const ICONS = {
    run: <path d="M7 4.5v15l12.5-7.5z" />,
    // a speaker, with sound waves or crossed out
    sound: (
        <React.Fragment>
            <path d="M4 9h4l5-4.5v15L8 15H4z" />
            <path
                d="M16 8.5a5 5 0 0 1 0 7M18.6 6a8.6 8.6 0 0 1 0 12"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
            />
        </React.Fragment>
    ),
    muted: (
        <React.Fragment>
            <path d="M4 9h4l5-4.5v15L8 15H4z" />
            <path
                d="M16 9l5 6M21 9l-5 6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
            />
        </React.Fragment>
    ),
    pause: (
        <React.Fragment>
            <rect
                height="15"
                rx="1.2"
                width="4.5"
                x="5.5"
                y="4.5"
            />
            <rect
                height="15"
                rx="1.2"
                width="4.5"
                x="14"
                y="4.5"
            />
        </React.Fragment>
    ),
    // step over: an arc hopping to the right onto a dot
    step: (
        <React.Fragment>
            <path
                d="M4 14a8 8 0 0 1 15.2-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.4"
            />
            <path d="M20.8 5.6l.2 6.2-6-1.4z" />
            <circle
                cx="12"
                cy="19"
                r="2.6"
            />
        </React.Fragment>
    ),
    reset: (
        <React.Fragment>
            <path
                d="M5.5 12a6.5 6.5 0 1 0 2-4.7"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.4"
            />
            <path d="M4 3.5v6h6z" />
        </React.Fragment>
    )
};

/**
 * A simulator control: an icon with its label, and a tooltip saying what it does.
 * @param {object} props Component props.
 * @param {string} props.icon Which icon, a key of `ICONS`.
 * @param {string} props.label The visible label.
 * @param {string} props.tip The tooltip.
 * @param {boolean} props.primary Whether it is the main action, drawn filled.
 * @param {boolean} props.disabled Whether it can be pressed.
 * @param {Function} props.onClick Called on press.
 * @returns {React.ReactElement} The button.
 */
const ControlButton = ({icon, label, tip, primary, disabled, onClick}) => (
    <button
        aria-label={label}
        className={classNames(styles.button, {[styles.primary]: primary})}
        data-variant={primary ? 'primary' : 'secondary'}
        disabled={disabled}
        title={tip}
        type="button"
        onClick={onClick}
    >
        <svg
            aria-hidden="true"
            className={styles.icon}
            fill="currentColor"
            viewBox="0 0 24 24"
        >{ICONS[icon]}</svg>
        <span className={styles.buttonLabel}>{label}</span>
    </button>
);

ControlButton.propTypes = {
    disabled: PropTypes.bool,
    icon: PropTypes.oneOf(Object.keys(ICONS)).isRequired,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    primary: PropTypes.bool,
    tip: PropTypes.string.isRequired
};
const DISTANCE_MIN_CM = 2;
const DISTANCE_MAX_CM = 400;

/** The gamepad buttons the panel offers, as the PS2 blocks name them, with the mark each shows. */
const PS2_BUTTONS = [
    ['PSB_PAD_UP', '▲'],
    ['PSB_PAD_DOWN', '▼'],
    ['PSB_PAD_LEFT', '◀'],
    ['PSB_PAD_RIGHT', '▶'],
    ['PSB_TRIANGLE', '△'],
    ['PSB_CIRCLE', '○'],
    ['PSB_CROSS', '✕'],
    ['PSB_SQUARE', '□'],
    ['PSB_L1', 'L1'],
    ['PSB_L2', 'L2'],
    ['PSB_R1', 'R1'],
    ['PSB_R2', 'R2'],
    ['PSB_SELECT', 'SELECT'],
    ['PSB_START', 'START']
];

/**
 * One gamepad button: pressed while the pointer holds it down.
 * @param {object} props Component props.
 * @param {string} props.name The button's PS2 constant.
 * @param {string} props.mark What the button shows.
 * @param {boolean} props.held Whether it is pressed now.
 * @param {Function} props.onChange Called with the name and whether it is now held.
 * @returns {React.ReactElement} The button.
 */
const Ps2Button = ({name, mark, held, onChange}) => {
    const press = useCallback(e => {
        e.preventDefault();
        onChange(name, true);
    }, [name, onChange]);
    const release = useCallback(() => {
        if (held) onChange(name, false);
    }, [held, name, onChange]);
    return (
        <button
            aria-pressed={held}
            className={classNames(styles.ps2Button, {[styles.ps2Held]: held})}
            title={name}
            type="button"
            onPointerDown={press}
            onPointerLeave={release}
            onPointerUp={release}
        >{mark}</button>
    );
};

Ps2Button.propTypes = {
    name: PropTypes.string.isRequired,
    mark: PropTypes.string.isRequired,
    held: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
};

/**
 * Paint a frame in the SSD1306 page layout (one byte per 8 vertical pixels) onto a canvas.
 * @param {HTMLCanvasElement} canvas The canvas, sized to the panel in pixels.
 * @param {{width: number, height: number, frame: Uint8Array}} oled The display state.
 */
const paintFrame = (canvas, oled) => {
    const context = canvas.getContext('2d');
    const image = context.createImageData(oled.width, oled.height);
    for (let y = 0; y < oled.height; y++) {
        for (let x = 0; x < oled.width; x++) {
            const on = oled.frame[x + ((y >> 3) * oled.width)] & (1 << (y & 7));
            const i = ((y * oled.width) + x) * 4;
            image.data[i] = on ? 0xd8 : 0;
            image.data[i + 1] = on ? 0xf3 : 0;
            image.data[i + 2] = on ? 0xff : 0;
            image.data[i + 3] = 0xff;
        }
    }
    context.putImageData(image, 0, 0);
};

const BLANK_OLED = {width: 128, height: 64, frame: new Uint8Array(128 * 8)};

const formatTime = us => {
    const ms = Math.floor(us / 1000);
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
};

/**
 * Place a box given in drawing units over the board drawing, as percentages of the drawing's extent.
 * @param {{x: number, y: number, width: number, height: number}} box The box in drawing units.
 * @param {{width: number, height: number}} extent The drawing's viewBox size.
 * @returns {object} The CSS position.
 */
const overlayStyle = (box, extent) => ({
    left: `${(box.x / extent.width) * 100}%`,
    top: `${(box.y / extent.height) * 100}%`,
    width: `${(box.width / extent.width) * 100}%`,
    height: `${(box.height / extent.height) * 100}%`
});

const SimPanel = ({
    distance,
    muted,
    onToggleMute = () => {},
    restarted,
    runError,
    roomy,
    usesOled,
    ps2Held,
    onDistanceChange,
    onPs2Change,
    snapshot,
    stale,
    problems,
    serial,
    speed,
    switchPressed,
    onRun,
    onPause,
    onStep,
    onReset,
    onSpeedChange,
    onSwitchChange
}) => {
    const intl = useIntl();
    const canvasRef = useRef(null);
    const zoomRef = useRef(null);
    const [zoomed, setZoomed] = useState(false);
    const toggleZoom = useCallback(() => setZoomed(z => !z), []);
    const running = Boolean(snapshot && snapshot.running);
    const blocked = problems.length > 0;

    const oled = (snapshot && snapshot.oled) || null;
    // The display is drawn while the program uses one: from its code before the first run, and from
    // the running board after.
    const showOled = Boolean(usesOled || oled);
    const rows = oled ? oled.height : BLANK_OLED.height;
    // The room is sized for the board with its display; without the display the drawing takes only the
    // board's share of that width, so the board keeps one scale as the display comes and goes.
    const full = boardExtent(true);
    const aspect = full.width / full.height;
    const part = boardExtent(showOled).width / full.width;

    useEffect(() => {
        // A reset before the next run sends no OLED state: paint the screen dark rather than keep the
        // last program's frame.
        for (const canvas of [canvasRef.current, zoomRef.current]) {
            if (canvas) paintFrame(canvas, oled || BLANK_OLED);
        }
    }, [snapshot, showOled, zoomed]);

    const pwm = snapshot ? snapshot.pwm : [];
    const press = useCallback(() => onSwitchChange(true), [onSwitchChange]);
    const release = useCallback(() => onSwitchChange(false), [onSwitchChange]);
    const handleSpeedChange = useCallback(e => onSpeedChange(Number(e.target.value)), [onSpeedChange]);
    const handleDistanceChange = useCallback(e => onDistanceChange(Number(e.target.value)), [onDistanceChange]);
    const inputs = (snapshot && snapshot.inputs) || {};

    return (
        <div
            className={classNames(styles.simPanel, {[styles.roomy]: roomy})}
            data-roomy={Boolean(roomy)}
        >
            <div className={styles.header}>
                <span className={styles.title}>{intl.formatMessage(messages.title)}</span>
                {running ? (
                    <ControlButton
                        primary
                        icon="pause"
                        label={intl.formatMessage(messages.pause)}
                        tip={intl.formatMessage(messages.pauseTip)}
                        onClick={onPause}
                    />
                ) : (
                    <ControlButton
                        primary
                        disabled={blocked}
                        icon="run"
                        label={intl.formatMessage(messages.run)}
                        tip={intl.formatMessage(messages.runTip)}
                        onClick={onRun}
                    />
                )}
                <ControlButton
                    disabled={blocked || running}
                    icon="step"
                    label={intl.formatMessage(messages.step)}
                    tip={intl.formatMessage(messages.stepTip)}
                    onClick={onStep}
                />
                <ControlButton
                    disabled={blocked}
                    icon="reset"
                    label={intl.formatMessage(messages.reset)}
                    tip={intl.formatMessage(messages.resetTip)}
                    onClick={onReset}
                />
                <ControlButton
                    icon={muted ? 'muted' : 'sound'}
                    label={intl.formatMessage(muted ? messages.unmute : messages.mute)}
                    tip={intl.formatMessage(muted ? messages.unmuteTip : messages.muteTip)}
                    onClick={onToggleMute}
                />
                <select
                    aria-label={intl.formatMessage(messages.speedTip)}
                    className={styles.speed}
                    title={intl.formatMessage(messages.speedTip)}
                    value={speed}
                    onChange={handleSpeedChange}
                >
                    {SPEEDS.map(s => (
                        <option
                            key={s}
                            value={s}
                        >{`${s}×`}</option>
                    ))}
                </select>
            </div>
            <div className={styles.body}>
                {problems.map((problem, i) => (
                    <div
                        className={styles.problem}
                        key={i}
                    >{problem.message}</div>
                ))}
                {/* An error from the last run is shown but does not lock the controls: Run or Reset tries again. */}
                {runError && <div className={styles.problem}>{runError}</div>}
                {restarted && <div className={styles.problem}>{intl.formatMessage(messages.restarted)}</div>}
                <div className={styles.rig}>
                    <div
                        className={styles.drawing}
                        style={{'--aspect': aspect, '--part': part}}
                    >
                        <ThingBotBoard
                            oledRows={showOled ? rows : null}
                            pwm={pwm}
                            switchLabel={intl.formatMessage(messages.switchLabel)}
                            switchPressed={switchPressed}
                            onPress={press}
                            onRelease={release}
                        />
                        {showOled && (
                            <canvas
                                ref={canvasRef}
                                className={styles.oled}
                                height={rows}
                                style={overlayStyle(oledActiveArea(rows), boardExtent(true))}
                                width={128}
                            />
                        )}
                    </div>
                </div>
                {showOled && (
                    <div className={styles.zoomRow}>
                        <button
                            aria-pressed={zoomed}
                            className={styles.button}
                            type="button"
                            onClick={toggleZoom}
                        >{intl.formatMessage(zoomed ? messages.unzoomOled : messages.zoomOled)}</button>
                        {zoomed && (
                            <canvas
                                ref={zoomRef}
                                className={styles.oledZoom}
                                height={rows}
                                style={{aspectRatio: `128 / ${rows}`}}
                                width={128}
                            />
                        )}
                    </div>
                )}
                {inputs.ultrasonic && (
                    <label className={styles.control}>
                        <span>{intl.formatMessage(messages.distance)}</span>
                        <input
                            className={styles.slider}
                            max={DISTANCE_MAX_CM}
                            min={DISTANCE_MIN_CM}
                            type="range"
                            value={distance}
                            onChange={handleDistanceChange}
                        />
                        <span className={styles.value}>{`${distance} cm`}</span>
                    </label>
                )}
                {inputs.ps2 && (
                    <div className={styles.control}>
                        <span>{intl.formatMessage(messages.gamepad)}</span>
                        <div className={styles.ps2Pad}>
                            {PS2_BUTTONS.map(([name, mark]) => (
                                <Ps2Button
                                    held={Boolean(ps2Held[name])}
                                    key={name}
                                    mark={mark}
                                    name={name}
                                    onChange={onPs2Change}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {serial && <pre className={styles.serial}>{serial}</pre>}
            </div>
            <div className={styles.status}>
                <span>{snapshot ? formatTime(snapshot.t) : formatTime(0)}</span>
                {stale && <span>{intl.formatMessage(messages.stale)}</span>}
                {snapshot && snapshot.error && (
                    <span>{intl.formatMessage(messages.halted, {reason: snapshot.error})}</span>
                )}
            </div>
        </div>
    );
};

SimPanel.propTypes = {
    muted: PropTypes.bool,
    onToggleMute: PropTypes.func,
    restarted: PropTypes.bool,
    roomy: PropTypes.bool,
    runError: PropTypes.string,
    usesOled: PropTypes.bool,
    distance: PropTypes.number.isRequired,
    ps2Held: PropTypes.objectOf(PropTypes.bool).isRequired,
    onDistanceChange: PropTypes.func.isRequired,
    onPs2Change: PropTypes.func.isRequired,
    snapshot: PropTypes.shape({
        t: PropTypes.number,
        running: PropTypes.bool,
        error: PropTypes.string,
        pwm: PropTypes.arrayOf(PropTypes.number),
        inputs: PropTypes.shape({ultrasonic: PropTypes.bool, ps2: PropTypes.bool}),
        oled: PropTypes.shape({
            width: PropTypes.number,
            height: PropTypes.number,
            frame: PropTypes.instanceOf(Uint8Array)
        })
    }),
    problems: PropTypes.arrayOf(PropTypes.shape({message: PropTypes.string})).isRequired,
    serial: PropTypes.string,
    speed: PropTypes.number.isRequired,
    switchPressed: PropTypes.bool.isRequired,
    onRun: PropTypes.func.isRequired,
    onPause: PropTypes.func.isRequired,
    onStep: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    onSpeedChange: PropTypes.func.isRequired,
    onSwitchChange: PropTypes.func.isRequired,
    stale: PropTypes.bool.isRequired
};

export default SimPanel;
