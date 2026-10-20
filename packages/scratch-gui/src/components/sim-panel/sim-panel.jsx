import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import styles from './sim-panel.css';

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
    switchLabel: {
        id: 'gui.simPanel.switch',
        defaultMessage: 'SW (hold)',
        description: 'Label of the virtual push button; it stays pressed while held'
    },
    halted: {
        id: 'gui.simPanel.halted',
        defaultMessage: 'The board stopped: {reason}',
        description: 'Shown when the virtual board resets on an error, such as dividing by zero'
    }
});

/** PCA9685 channels of the ThingBot's two LEDs and buzzer. */
const LED_1 = 15;
const LED_2 = 13;
const BUZZER = 14;
const SPEEDS = [1, 10, 100];

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

const formatTime = us => {
    const ms = Math.floor(us / 1000);
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
};

const Led = ({color, duty, label}) => (
    <div className={styles.part}>
        <span
            className={styles.led}
            style={{background: color, opacity: 0.15 + (0.85 * duty / 4096)}}
        />
        {label}
    </div>
);

Led.propTypes = {
    color: PropTypes.string.isRequired,
    duty: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired
};

const SimPanel = ({
    snapshot,
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
    const running = Boolean(snapshot && snapshot.running);
    const blocked = problems.length > 0;

    useEffect(() => {
        if (canvasRef.current && snapshot && snapshot.oled) paintFrame(canvasRef.current, snapshot.oled);
    }, [snapshot]);

    const pwm = snapshot ? snapshot.pwm : [];
    const press = useCallback(() => onSwitchChange(true), [onSwitchChange]);
    const release = useCallback(() => onSwitchChange(false), [onSwitchChange]);
    const handleSpeedChange = useCallback(e => onSpeedChange(Number(e.target.value)), [onSpeedChange]);

    return (
        <div className={styles.simPanel}>
            <div className={styles.header}>
                <span className={styles.title}>{intl.formatMessage(messages.title)}</span>
                {running ? (
                    <button
                        className={styles.button}
                        onClick={onPause}
                    >{intl.formatMessage(messages.pause)}</button>
                ) : (
                    <button
                        className={styles.button}
                        disabled={blocked}
                        onClick={onRun}
                    >{intl.formatMessage(messages.run)}</button>
                )}
                <button
                    className={styles.button}
                    disabled={blocked || running}
                    onClick={onStep}
                >{intl.formatMessage(messages.step)}</button>
                <button
                    className={styles.button}
                    disabled={blocked}
                    onClick={onReset}
                >{intl.formatMessage(messages.reset)}</button>
                <select
                    className={styles.speed}
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
            {problems.map((problem, i) => (
                <div
                    className={styles.problem}
                    key={i}
                >{problem.message}</div>
            ))}
            <div className={styles.rig}>
                <canvas
                    ref={canvasRef}
                    className={styles.oled}
                    width={128}
                    height={64}
                />
                <div className={styles.parts}>
                    <Led
                        color="#ef4444"
                        duty={pwm[LED_1] || 0}
                        label="LED 1"
                    />
                    <Led
                        color="#22c55e"
                        duty={pwm[LED_2] || 0}
                        label="LED 2"
                    />
                    <Led
                        color="#f59e0b"
                        duty={pwm[BUZZER] || 0}
                        label="Buzzer"
                    />
                    <div className={styles.part}>
                        <button
                            aria-label={intl.formatMessage(messages.switchLabel)}
                            aria-pressed={switchPressed}
                            className={classNames(styles.switch, {[styles.switchPressed]: switchPressed})}
                            onMouseDown={press}
                            onMouseLeave={release}
                            onMouseUp={release}
                            onTouchEnd={release}
                            onTouchStart={press}
                        />
                        {intl.formatMessage(messages.switchLabel)}
                    </div>
                </div>
            </div>
            {serial && <pre className={styles.serial}>{serial}</pre>}
            <div className={styles.status}>
                <span>{snapshot ? formatTime(snapshot.t) : formatTime(0)}</span>
                {snapshot && snapshot.error && (
                    <span>{intl.formatMessage(messages.halted, {reason: snapshot.error})}</span>
                )}
            </div>
        </div>
    );
};

SimPanel.propTypes = {
    snapshot: PropTypes.shape({
        t: PropTypes.number,
        running: PropTypes.bool,
        error: PropTypes.string,
        pwm: PropTypes.arrayOf(PropTypes.number),
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
    onSwitchChange: PropTypes.func.isRequired
};

export default SimPanel;
