import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, useIntl} from 'react-intl';

import styles from './sim-panel.css';

/**
 * The ThingBot as it sits on the desk, drawn flat: Shield with the Core on top, laid out like the real
 * board (and the pin diagram in the ThingBot course on robot.edu.vn). Everything that moves reads the
 * PCA9685 duties of the snapshot: LEDs glow, the buzzer sounds, servo horns turn, motor wheels spin.
 */

/** PCA9685 channels, the same `#define`s the generated C++ uses. */
const LED_1 = 15;
const LED_2 = 13;
const BUZZER = 14;
const SERVOS = [12, 11, 10, 9, 8]; // S1 … S5
const MOTORS = [[2, 3], [4, 5], [7, 6], [1, 0]]; // M1 … M4 as [A, B]
const SERVO_PULSE_MIN = 102;
const SERVO_PULSE_MAX = 512;
const FULL = 4096;


/** Hover texts that say each part's state in words, with its unit. */
const messages = defineMessages({
    motorOn: {
        id: 'gui.simBoard.motorOn',
        defaultMessage: 'Motor M{n}: {direction}, {percent}% speed',
        description: 'Tooltip of a running motor on the virtual board'
    },
    motorOff: {
        id: 'gui.simBoard.motorOff',
        defaultMessage: 'Motor M{n}: stopped',
        description: 'Tooltip of a stopped motor on the virtual board'
    },
    forward: {
        id: 'gui.simBoard.forward',
        defaultMessage: 'forward',
        description: 'Motor direction in a board tooltip'
    },
    backward: {
        id: 'gui.simBoard.backward',
        defaultMessage: 'backward',
        description: 'Motor direction in a board tooltip'
    },
    servo: {
        id: 'gui.simBoard.servo',
        defaultMessage: 'Servo S{n}: angle {angle}°',
        description: 'Tooltip of a servo on the virtual board'
    },
    servoUnset: {
        id: 'gui.simBoard.servoUnset',
        defaultMessage: 'Servo S{n}: no angle set yet',
        description: 'Tooltip of a servo the program has not moved'
    },
    ledOn: {
        id: 'gui.simBoard.ledOn',
        defaultMessage: 'LED {name}: on, {percent}% brightness',
        description: 'Tooltip of a lit LED on the virtual board'
    },
    ledOff: {
        id: 'gui.simBoard.ledOff',
        defaultMessage: 'LED {name}: off',
        description: 'Tooltip of an unlit LED on the virtual board'
    },
    buzzerOn: {
        id: 'gui.simBoard.buzzerOn',
        defaultMessage: 'Buzzer: sounding at {hz} Hz',
        description: 'Tooltip of the virtual buzzer while it sounds'
    },
    buzzerOff: {
        id: 'gui.simBoard.buzzerOff',
        defaultMessage: 'Buzzer: off',
        description: 'Tooltip of the silent virtual buzzer'
    }
});

/** A PCA9685 duty (out of 4096) as a whole percentage. */
const percentOf = duty => Math.round(Math.min(duty, FULL) * 100 / FULL);

const BX = 62;
const BY = 30;
const W = 210;
const H = 240;
/** The Shield's servo header: one column of 15 pins, GND · 5V · S from S5 at the top down to S1. */
const HDR_X = BX + 11;
const HDR_Y = BY + 44;
const HDR_STEP = 10.5;
const signalPin = n => HDR_Y + ((14 - ((n - 1) * 3)) * HDR_STEP);

/**
 * Drawing units per millimetre. Nothing documents the ThingBot's PCB outline, so the scale comes from
 * the servo header: its pins sit on the standard 2.54 mm pitch, `HDR_STEP` apart in the drawing.
 */
export const MM = HDR_STEP / 2.54;

/**
 * A 0.96" 128×64 I2C OLED module (SSD1306 class) at the board's scale: a 27.3 × 27.8 mm blue PCB, its
 * 4-pin header (GND · VCC · SDA · SCL, 2.54 mm pitch) on the top edge, a 26.7 × 19.26 mm glass whose
 * active area is 21.744 × 10.864 mm. It hangs off the I2C socket on a 4-wire cable, as in the kit.
 */
const OLED_W = 27.3 * MM;
const OLED_H = 27.8 * MM;
const OLED_X = BX + W + 52;
const OLED_Y = BY + 92;
const GLASS_W = 26.7 * MM;
const GLASS_H = 19.26 * MM;
const GLASS_X = OLED_X + ((OLED_W - GLASS_W) / 2);
const GLASS_Y = OLED_Y + (6.2 * MM);
const OLED_HEADER_Y = OLED_Y + (1.6 * MM);
const OLED_PIN_X = i => OLED_X + (OLED_W / 2) + ((i - 1.5) * 2.54 * MM);
/**
 * The cable, pin by pin: [module label, wire colour, board socket label]. Both connectors read
 * GND · 5V (VCC) · SDA · SCL: the module's header from left to right, the board's I2C socket from
 * the bottom up. A flat cable from a vertical socket to a header it reaches from above can only stay
 * uncrossed with the orders running that way round; the wires go GND→GND, 5V→VCC, SDA→SDA, SCL→SCL.
 */
export const OLED_PINS = [
    ['GND', '#1b1b1b', 'GND'],
    ['VCC', '#d62d20', '5V'],
    ['SDA', '#2f7bd6', 'SDA'],
    ['SCL', '#f2c230', 'SCL']
];
/** The I2C socket on the board's right edge: four pins, top to bottom. */
const I2C_X = BX + 192;
const I2C_PIN_Y = i => BY + 106 + ((i + 0.5) * 9);
/** The socket pin that cable wire `i` (in OLED_PINS order) plugs into: GND is the bottom one. */
const I2C_WIRE_Y = i => I2C_PIN_Y(OLED_PINS.length - 1 - i);

/**
 * Where the display's pixels go, in drawing units, for a panel of `height` rows (64, or 32 for the
 * 0.91" glass, which keeps the same width).
 * @param {number} height The panel's rows.
 * @returns {{x: number, y: number, width: number, height: number}} The active area.
 */
export const oledActiveArea = height => {
    const width = 21.744 * MM;
    const rows = (height === 32 ? 5.584 : 10.864) * MM;
    return {
        x: GLASS_X + ((GLASS_W - width) / 2),
        y: GLASS_Y + (1.9 * MM),
        width,
        height: rows
    };
};

/**
 * The drawing's extent: the board with its wheels, widened to the right when the display is plugged in.
 * @param {boolean} withOled Whether the display module is drawn.
 * @returns {{width: number, height: number}} The viewBox size.
 */
export const boardExtent = withOled => ({
    width: withOled ? OLED_X + OLED_W + 6 : BX + W + 48,
    height: BY + H + 24
});

/** Where each motor's wheel sits: next to its port, M3 and M4 on top, M2 and M1 below. */
const WHEELS = [
    {x: BX + W + 24, y: BY + H - 12},
    {x: BX - 24, y: BY + H - 12},
    {x: BX - 24, y: BY + 4},
    {x: BX + W + 24, y: BY + 4}
];

const glow = duty => 0.15 + (0.85 * Math.min(duty, FULL) / FULL);

/**
 * A servo's angle from its pulse, as `servoSetAngle()` mapped it; null while the channel is not pulsing.
 * @param {number} duty The channel's duty, 0–4096.
 * @returns {?number} The angle in degrees.
 */
const servoAngle = duty => {
    if (duty <= 0 || duty >= FULL) return null;
    const angle = (duty - SERVO_PULSE_MIN) * 180 / (SERVO_PULSE_MAX - SERVO_PULSE_MIN);
    return Math.max(0, Math.min(180, angle));
};

/* A white or black JST socket seen from above, with its pins. */
const Socket = ({x, y, w, h, pins, dark, vertical}) => {
    const pinsAt = [];
    for (let i = 0; i < pins; i++) {
        const t = (i + 0.5) / pins;
        pinsAt.push(vertical ? [x + (w / 2), y + (t * h)] : [x + (t * w), y + (h / 2)]);
    }
    return (
        <g>
            <rect
                fill={dark ? '#0c0d0f' : '#cfd3cc'}
                height={h}
                rx={2}
                width={w}
                x={x}
                y={y + 2}
            />
            <rect
                fill={dark ? '#2a2d31' : '#f6f6f1'}
                height={h}
                rx={2}
                width={w}
                x={x}
                y={y}
            />
            {pinsAt.map(([px, py]) => (
                <rect
                    fill="#c9a447"
                    height={3}
                    key={`${px},${py}`}
                    width={3}
                    x={px - 1.5}
                    y={py - 1.5}
                />
            ))}
        </g>
    );
};

Socket.propTypes = {
    dark: PropTypes.bool,
    h: PropTypes.number.isRequired,
    pins: PropTypes.number.isRequired,
    vertical: PropTypes.bool,
    w: PropTypes.number.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired
};

const Silk = ({x, y, children, anchor = 'middle', size = 7}) => (
    <text
        className={styles.silk}
        fontSize={size}
        textAnchor={anchor}
        x={x}
        y={y}
    >{children}</text>
);

Silk.propTypes = {
    anchor: PropTypes.string,
    children: PropTypes.node,
    size: PropTypes.number,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired
};

/** The parts that never change, drawn once. */
const BoardArt = React.memo(() => (
    <g>
        <rect
            fill="#0f5b31"
            height={H}
            rx={24}
            width={W}
            x={BX}
            y={BY + 4}
        />
        <rect
            fill="#1c8a4a"
            height={H}
            rx={24}
            width={W}
            x={BX}
            y={BY}
        />
        {[[BX + 11, BY + 22], [BX + W - 11, BY + 22], [BX + 11, BY + H - 50], [BX + W - 11, BY + H - 50]].map(
            ([x, y]) => (
                <circle
                    cx={x}
                    cy={y}
                    fill="#ffffff"
                    key={`${x},${y}`}
                    r={4}
                    stroke="#d7b25a"
                    strokeWidth={2.5}
                />
            )
        )}
        {/* top edge: M3 · jack 5–9V · ON/OFF · M4 */}
        <Socket
            h={18}
            pins={2}
            w={30}
            x={BX + 22}
            y={BY - 8}
        />
        <rect
            fill="#26292d"
            height={34}
            rx={3}
            width={30}
            x={BX + 60}
            y={BY - 6}
        />
        <circle
            cx={BX + 75}
            cy={BY + 12}
            fill="#0b0c0e"
            r={7}
        />
        <rect
            fill="#dfe3e6"
            height={13}
            rx={3}
            width={44}
            x={BX + 100}
            y={BY + 3}
        />
        <rect
            fill="#1d1f22"
            height={9}
            rx={2}
            width={14}
            x={BX + 104}
            y={BY + 5}
        />
        <Socket
            h={18}
            pins={2}
            w={30}
            x={BX + 152}
            y={BY - 8}
        />
        <Silk
            x={BX + 37}
            y={BY + 20}
        >{'M3'}</Silk>
        <Silk
            x={BX + 122}
            y={BY + 25}
        >{'ON ↔ OFF'}</Silk>
        <Silk
            x={BX + 167}
            y={BY + 20}
        >{'M4'}</Silk>
        {/* servo header */}
        <rect
            fill="#202326"
            height={(14 * HDR_STEP) + 10}
            rx={2}
            width={9}
            x={HDR_X - 4.5}
            y={HDR_Y - 5}
        />
        {Array.from({length: 15}, (_, i) => (
            <rect
                fill="#c9a447"
                height={3.5}
                key={i}
                width={3.5}
                x={HDR_X - 1.75}
                y={HDR_Y + (i * HDR_STEP) - 1.75}
            />
        ))}
        {[1, 2, 3, 4, 5].map(n => (
            <Silk
                anchor="start"
                key={n}
                size={6}
                x={HDR_X + 7}
                y={signalPin(n) + 2}
            >{`S${n}`}</Silk>
        ))}
        {/* ThingBot Core */}
        <rect
            fill="#147a42"
            height={150}
            rx={5}
            width={140}
            x={BX + 30}
            y={BY + 48}
        />
        <rect
            fill="#25a35f"
            height={150}
            rx={5}
            width={140}
            x={BX + 30}
            y={BY + 44}
        />
        <Silk
            anchor="start"
            size={11}
            x={BX + 40}
            y={BY + 62}
        >{'ThingEdu'}</Silk>
        <Silk
            anchor="start"
            size={6}
            x={BX + 40}
            y={BY + 72}
        >{'ESP32-C3 · PCA9685'}</Silk>
        <circle
            cx={BX + 100}
            cy={BY + 115}
            fill="none"
            r={24}
            stroke="#eef6ef"
            strokeWidth={4}
        />
        <Silk
            size={9}
            x={BX + 100}
            y={BY + 182}
        >{'ThingBot Core'}</Silk>
        <rect
            fill="#d5d9dd"
            height={8}
            rx={3}
            width={24}
            x={BX + 104}
            y={BY + 188}
        />
        {/* right edge: PS2 · I2C */}
        <Socket
            h={52}
            pins={6}
            vertical
            w={16}
            x={BX + 184}
            y={BY + 46}
        />
        <Socket
            h={36}
            pins={4}
            vertical
            w={16}
            x={BX + 184}
            y={BY + 106}
        />
        <Silk
            x={BX + 192}
            y={BY + 42}
        >{'PS2'}</Silk>
        <Silk
            x={BX + 192}
            y={BY + 152}
        >{'I2C'}</Silk>
        {OLED_PINS.map(([, , label], i) => (
            <Silk
                anchor="end"
                key={label}
                size={4.2}
                x={BX + 182}
                y={I2C_WIRE_Y(i) + 1.5}
            >{label}</Silk>
        ))}
        {/* bottom edge: M2 · IO0 · IO4 · M1 */}
        <Socket
            dark
            h={22}
            pins={2}
            w={26}
            x={BX + 32}
            y={BY + H - 30}
        />
        <Socket
            dark
            h={22}
            pins={4}
            w={44}
            x={BX + 60}
            y={BY + H - 30}
        />
        <Socket
            dark
            h={22}
            pins={4}
            w={44}
            x={BX + 106}
            y={BY + H - 30}
        />
        <Socket
            dark
            h={22}
            pins={2}
            w={26}
            x={BX + 152}
            y={BY + H - 30}
        />
        {[['M2', 45], ['IO0', 82], ['IO4', 128], ['M1', 165]].map(([label, dx]) => (
            <Silk
                key={label}
                size={6}
                x={BX + dx}
                y={BY + H - 34}
            >{label}</Silk>
        ))}
    </g>
));
BoardArt.displayName = 'BoardArt';

const Servo = ({n, duty}) => {
    const intl = useIntl();
    const angle = servoAngle(duty);
    const y = signalPin(n);
    const pivot = 34;
    return (
        <g opacity={angle === null ? 0.35 : 1}>
            <title>{angle === null ?
                intl.formatMessage(messages.servoUnset, {n}) :
                intl.formatMessage(messages.servo, {n, angle: Math.round(angle)})}</title>
            <line
                stroke="#f59324"
                strokeWidth={1.5}
                x1={pivot + 6}
                x2={HDR_X - 4}
                y1={y}
                y2={y}
            />
            <rect
                fill="#3a7be0"
                height={16}
                rx={3}
                width={38}
                x={pivot - 30}
                y={y - 8}
            />
            <text
                className={styles.servoText}
                x={pivot - 27}
                y={y + 2.5}
            >{angle === null ? `S${n}` : `${Math.round(angle)}°`}</text>
            <g transform={`rotate(${(angle === null ? 90 : angle) - 90} ${pivot} ${y})`}>
                <rect
                    fill="#f6f6f1"
                    height={4}
                    rx={2}
                    stroke="#9aa1a7"
                    strokeWidth={0.5}
                    width={12}
                    x={pivot}
                    y={y - 2}
                />
            </g>
            <circle
                cx={pivot}
                cy={y}
                fill="#f6f6f1"
                r={3}
            />
        </g>
    );
};

Servo.propTypes = {
    duty: PropTypes.number.isRequired,
    n: PropTypes.number.isRequired
};

const Wheel = ({n, a, b}) => {
    const {x, y} = WHEELS[n - 1];
    // `set motor … forward` drives B and grounds A; backward the other way round.
    const intl = useIntl();
    const level = Math.min(Math.max(a, b), FULL) / FULL;
    const forward = b >= a;
    return (
        <g opacity={level > 0 ? 1 : 0.35}>
            <title>{level > 0 ?
                intl.formatMessage(messages.motorOn, {
                    n,
                    direction: intl.formatMessage(forward ? messages.forward : messages.backward),
                    percent: Math.round(level * 100)
                }) :
                intl.formatMessage(messages.motorOff, {n})}</title>
            <circle
                cx={x}
                cy={y}
                fill="#2b2b2b"
                r={13}
            />
            <g
                className={level > 0 ? styles.spin : null}
                style={{
                    transformOrigin: `${x}px ${y}px`,
                    animationDuration: level > 0 ? `${(0.25 / level).toFixed(2)}s` : null,
                    animationDirection: forward ? 'normal' : 'reverse'
                }}
            >
                <rect
                    fill="#f2c230"
                    height={20}
                    rx={2}
                    width={4}
                    x={x - 2}
                    y={y - 10}
                />
                <rect
                    fill="#f2c230"
                    height={4}
                    rx={2}
                    width={20}
                    x={x - 10}
                    y={y - 2}
                />
            </g>
            <text
                className={styles.boardLabel}
                textAnchor="middle"
                x={x}
                y={y + 22}
            >{level > 0 ? `M${n} ${forward ? '↻' : '↺'} ${Math.round(level * 100)}%` : `M${n}`}</text>
        </g>
    );
};

Wheel.propTypes = {
    a: PropTypes.number.isRequired,
    b: PropTypes.number.isRequired,
    n: PropTypes.number.isRequired
};

/** The display module and its cable; the pixels are painted over the active area by the panel. */
const OledModule = React.memo(({rows}) => {
    const active = oledActiveArea(rows);
    const hole = (2.0 * MM);
    return (
        <g>
            {OLED_PINS.map(([name, color], i) => {
                const sy = I2C_WIRE_Y(i);
                const px = OLED_PIN_X(i);
                // GND leaves the lowest socket pin, turns up nearest the module and runs lowest over
                // the header, so no two wires cross.
                const bend = OLED_X - 10 - (i * 3);
                const over = OLED_HEADER_Y - 14 - (i * 3);
                return (
                    <path
                        d={`M${I2C_X},${sy} C${bend - 20},${sy} ${bend},${sy} ${bend},${over} ` +
                            `L${px},${over} L${px},${OLED_HEADER_Y}`}
                        fill="none"
                        key={name}
                        stroke={color}
                        strokeLinejoin="round"
                        strokeWidth={2}
                    />
                );
            })}
            <rect
                fill="#123f7d"
                height={OLED_H}
                rx={1.2 * MM}
                width={OLED_W}
                x={OLED_X}
                y={OLED_Y + 3}
            />
            <rect
                fill="#1f5fbf"
                height={OLED_H}
                rx={1.2 * MM}
                width={OLED_W}
                x={OLED_X}
                y={OLED_Y}
            />
            {[[hole, hole], [OLED_W - hole, hole], [hole, OLED_H - hole], [OLED_W - hole, OLED_H - hole]].map(
                ([dx, dy]) => (
                    <circle
                        cx={OLED_X + dx}
                        cy={OLED_Y + dy}
                        fill="#ffffff"
                        key={`${dx},${dy}`}
                        r={1.0 * MM}
                        stroke="#d7b25a"
                        strokeWidth={1.5}
                    />
                )
            )}
            {OLED_PINS.map(([name], i) => (
                <g key={name}>
                    <rect
                        fill="#c9a447"
                        height={3.5}
                        width={3.5}
                        x={OLED_PIN_X(i) - 1.75}
                        y={OLED_HEADER_Y - 1.75}
                    />
                    <Silk
                        size={3.4}
                        x={OLED_PIN_X(i)}
                        y={OLED_HEADER_Y + 7}
                    >{name}</Silk>
                </g>
            ))}
            <rect
                fill="#0b0c0e"
                height={GLASS_H}
                rx={0.6 * MM}
                width={GLASS_W}
                x={GLASS_X}
                y={GLASS_Y}
            />
            <rect
                fill="#000000"
                height={active.height}
                stroke="#1f2328"
                strokeWidth={0.6}
                width={active.width}
                x={active.x}
                y={active.y}
            />
            <Silk
                size={5}
                x={OLED_X + (OLED_W / 2)}
                y={OLED_Y + OLED_H - (1.4 * MM)}
            >{rows === 32 ? '0.91" OLED 128×32' : '0.96" OLED 128×64'}</Silk>
        </g>
    );
});
OledModule.displayName = 'OledModule';
OledModule.propTypes = {
    rows: PropTypes.number.isRequired
};

const ThingBotBoard = ({pwm, pwmHz, oledRows, switchLabel, switchPressed, onPress, onRelease}) => {
    const intl = useIntl();
    const ledTip = (name, d) => (d > 0 ?
        intl.formatMessage(messages.ledOn, {name, percent: percentOf(d)}) :
        intl.formatMessage(messages.ledOff, {name}));
    const duty = ch => pwm[ch] || 0;
    const buzzing = duty(BUZZER) > 0;
    const l2y = signalPin(1) + 12;
    const extent = boardExtent(Boolean(oledRows));
    return (
        <svg
            className={styles.board}
            role="img"
            aria-label="ThingBot"
            viewBox={`0 0 ${extent.width} ${extent.height}`}
        >
            <BoardArt />
            {oledRows ? <OledModule rows={oledRows} /> : null}
            {SERVOS.map((ch, i) => (
                <Servo
                    duty={duty(ch)}
                    key={ch}
                    n={i + 1}
                />
            ))}
            {MOTORS.map(([a, b], i) => (
                <Wheel
                    a={duty(a)}
                    b={duty(b)}
                    key={i}
                    n={i + 1}
                />
            ))}
            {/* L2 next to S1, L1 next to SW, the buzzer under the Core (drawn on top to be seen) */}
            <g>
                <title>{ledTip('L2', duty(LED_2))}</title>
                <circle
                    cx={HDR_X + 12}
                    cy={l2y}
                    fill="#2fd158"
                    opacity={glow(duty(LED_2))}
                    r={4}
                    stroke="#f6f6f1"
                    strokeWidth={1}
                />
                <Silk
                    anchor="start"
                    size={6}
                    x={HDR_X + 18}
                    y={l2y + 2}
                >{duty(LED_2) > 0 ? `L2 ${percentOf(duty(LED_2))}%` : 'L2'}</Silk>
            </g>
            <g>
                <title>{ledTip('L1', duty(LED_1))}</title>
                <circle
                    cx={BX + 186}
                    cy={BY + 200}
                    fill="#ff3b30"
                    opacity={glow(duty(LED_1))}
                    r={4}
                    stroke="#f6f6f1"
                    strokeWidth={1}
                />
                <Silk
                    x={BX + 186}
                    y={BY + 212}
                >{duty(LED_1) > 0 ? `L1 ${percentOf(duty(LED_1))}%` : 'L1'}</Silk>
            </g>
            <g>
                <title>{buzzing && pwmHz > 0 ?
                    intl.formatMessage(messages.buzzerOn, {hz: Math.round(pwmHz)}) :
                    intl.formatMessage(messages.buzzerOff)}</title>
                <circle
                    cx={BX + 140}
                    cy={BY + 160}
                    fill="#17191c"
                    r={9}
                    stroke="#3b3f45"
                />
                {buzzing && (
                    <path
                        d={`M${BX + 153},${BY + 154} q5,6 0,12 M${BX + 158},${BY + 150} q8,10 0,20`}
                        fill="none"
                        stroke="#f59e0b"
                        strokeLinecap="round"
                        strokeWidth={2}
                    />
                )}
                {buzzing && pwmHz > 0 && (
                    <Silk
                        anchor="start"
                        size={6}
                        x={BX + 166}
                        y={BY + 152}
                    >{`${Math.round(pwmHz)} Hz`}</Silk>
                )}
            </g>
            <g
                aria-label={switchLabel}
                aria-pressed={switchPressed}
                className={styles.boardSwitch}
                role="button"
                onMouseDown={onPress}
                onMouseLeave={onRelease}
                onMouseUp={onRelease}
                onTouchEnd={onRelease}
                onTouchStart={onPress}
            >
                <rect
                    fill="#2a2d31"
                    height={22}
                    rx={3}
                    width={16}
                    x={BX + 194}
                    y={BY + 162}
                />
                <rect
                    fill={switchPressed ? '#616e7c' : '#111111'}
                    height={14}
                    rx={2}
                    width={6}
                    x={BX + 206}
                    y={BY + 166}
                />
                <Silk
                    x={BX + 200}
                    y={BY + 158}
                >{'SW'}</Silk>
            </g>
        </svg>
    );
};

ThingBotBoard.propTypes = {
    onPress: PropTypes.func.isRequired,
    pwmHz: PropTypes.number,
    oledRows: PropTypes.number,
    onRelease: PropTypes.func.isRequired,
    pwm: PropTypes.arrayOf(PropTypes.number).isRequired,
    switchLabel: PropTypes.string.isRequired,
    switchPressed: PropTypes.bool.isRequired
};

export default ThingBotBoard;
