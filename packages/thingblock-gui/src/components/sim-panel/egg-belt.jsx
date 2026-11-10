/**
 * The egg sorting belt in front of the IR eye, drawn from the simulator's belt state. The drawing follows
 * ThingEdu/thingbot-sim `src/belt.ts` (https://github.com/ThingEdu/thingbot-sim, commit bde12a2); the belt
 * itself runs in the simulator (thingblock-sim `hal/rig.ts`), whose geometry the constants below mirror.
 */
import PropTypes from 'prop-types';
import React, {useEffect, useRef} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import styles from './sim-panel.css';

const messages = defineMessages({
    label: {
        id: 'gui.simPanel.belt.label',
        defaultMessage: 'Egg sorting belt',
        description: 'Accessible name of the drawing of the virtual egg sorting belt'
    },
    motor: {
        id: 'gui.simPanel.belt.motor',
        defaultMessage: 'Motor M1',
        description: 'Label under the roller of the virtual belt, which motor M1 turns'
    },
    rejectBin: {
        id: 'gui.simPanel.belt.rejectBin',
        defaultMessage: 'Reject bin',
        description: 'Label of the bin the gate arm pushes eggs into'
    },
    goodBin: {
        id: 'gui.simPanel.belt.goodBin',
        defaultMessage: 'Good eggs',
        description: 'Label of the bin at the end of the belt, where eggs that pass the gate land'
    },
    servo: {
        id: 'gui.simPanel.belt.servo',
        defaultMessage: 'Servo S1 {angle}°',
        description: 'Label of the gate arm, which servo S1 turns, with its angle in degrees'
    },
    eye: {
        id: 'gui.simPanel.belt.eye',
        defaultMessage: 'IR eye IO4 = {value}',
        description: 'Label of the IR eye above the belt, with the number it reads (0 to 4095)'
    },
    score: {
        id: 'gui.simPanel.belt.score',
        defaultMessage: 'Pushed out {bad} bad eggs · let through {good} good eggs',
        description: 'Tally of the eggs the belt sorted the right way'
    },
    wrong: {
        id: 'gui.simPanel.belt.wrong',
        defaultMessage: '{wrong} wrong',
        description: 'Added to the tally, after a dot, when some eggs went into the wrong bin'
    }
});

/** Millimetres along the belt, as in thingblock-sim `hal/rig.ts`. */
const LENGTH = 300;
const GATE_X = 200;
const SENSOR_X = 196;
const SENSE_HALF = 10;
const EGG_R = 11;
/** The drawing's extent in millimetres, and where the belt runs. */
const WIDTH = LENGTH + 70;
const HEIGHT = 190;
const BELT_Y = 92;
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * Paint the belt onto a canvas sized to its box.
 * @param {HTMLCanvasElement} canvas The canvas.
 * @param {object} belt The simulator's belt state.
 * @param {object} text The labels, already in the learner's language.
 */
const paintBelt = (canvas, belt, text) => {
    const g = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!g || !cw || !ch) return;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
    }
    const s = Math.min((cw - 24) / WIDTH, (ch - 24) / HEIGHT);
    const ox = ((cw - (WIDTH * s)) / 2) + (10 * s);
    const oy = (ch - (HEIGHT * s)) / 2;
    const X = mm => ox + (mm * s);
    const Y = mm => oy + (mm * s);
    const font = (px, bold) => `${bold ? 'bold ' : ''}${Math.max(10, px * s)}px ${FONT}`;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cw, ch);
    g.fillStyle = '#fbf8f1';
    g.fillRect(0, 0, cw, ch);

    // The rubber belt, its stripes moving with the distance run, and the two yellow rollers.
    g.fillStyle = '#7b7f86';
    g.fillRect(X(-8), Y(BELT_Y), (LENGTH + 16) * s, 14 * s);
    g.strokeStyle = '#9ea3ab';
    g.lineWidth = 1.5;
    for (let m = -(belt.moved % 20); m < LENGTH; m += 20) {
        g.beginPath();
        g.moveTo(X(m), Y(BELT_Y + 2));
        g.lineTo(X(m + 6), Y(BELT_Y + 12));
        g.stroke();
    }
    for (const cx of [-1, LENGTH + 1]) {
        g.fillStyle = '#f2c230';
        g.beginPath();
        g.arc(X(cx), Y(BELT_Y + 7), 9 * s, 0, Math.PI * 2);
        g.fill();
    }
    g.fillStyle = '#555';
    g.font = font(11);
    g.textAlign = 'left';
    g.fillText(text.motor, X(-10), Y(BELT_Y + 32));

    // The reject bin under the gate and the good bin at the end of the belt.
    g.textAlign = 'center';
    const bin = (x, w, label, n, color) => {
        g.fillStyle = color;
        g.fillRect(X(x), Y(BELT_Y + 36), w * s, 46 * s);
        g.fillStyle = '#fff';
        g.font = font(12, true);
        g.fillText(String(n), X(x + (w / 2)), Y(BELT_Y + 64));
        g.fillStyle = '#3d3a35';
        g.font = font(11);
        g.fillText(label, X(x + (w / 2)), Y(BELT_Y + 96));
    };
    bin(GATE_X - 30, 60, text.rejectBin, belt.rejectedBad + belt.rejectedGood, '#b5523b');
    bin(LENGTH + 8, 52, text.goodBin, belt.passedGood + belt.passedBad, '#3f8a5a');

    // Servo S1's gate arm: 0° lifted, 90° down across the belt.
    const a = (Math.min(90, Math.max(0, belt.gate)) * Math.PI) / 180;
    const px = X(GATE_X + 26);
    const py = Y(BELT_Y - 30);
    g.strokeStyle = '#2d6fb8';
    g.lineWidth = 5 * s;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px - (Math.cos(a) * 42 * s), py + (Math.sin(a) * 42 * s));
    g.stroke();
    g.fillStyle = '#1e4f8c';
    g.fillRect(px - (9 * s), py - (12 * s), 18 * s, 14 * s);
    g.font = font(11, true);
    g.textAlign = 'left';
    g.fillText(text.servo, px + (13 * s), py - s);

    // The IR eye just before the gate, with its beam.
    g.fillStyle = '#20232a';
    g.fillRect(X(SENSOR_X - 8), Y(BELT_Y - 58), 16 * s, 12 * s);
    g.fillStyle = 'rgba(226,71,59,0.22)';
    g.beginPath();
    g.moveTo(X(SENSOR_X - 4), Y(BELT_Y - 46));
    g.lineTo(X(SENSOR_X + 4), Y(BELT_Y - 46));
    g.lineTo(X(SENSOR_X + SENSE_HALF), Y(BELT_Y));
    g.lineTo(X(SENSOR_X - SENSE_HALF), Y(BELT_Y));
    g.fill();
    g.fillStyle = '#3d3a35';
    g.font = font(11);
    g.textAlign = 'center';
    g.fillText(text.eye, X(SENSOR_X - 50), Y(BELT_Y - 64));

    // The eggs: on the belt, or dropping into the bin they were sorted into.
    for (const e of belt.eggs) {
        let x = e.x;
        let y = BELT_Y - EGG_R + 1;
        if (e.fate === 'reject') {
            x = GATE_X + (Math.min(e.fall, 0.4) * 10);
            y += Math.min(1, e.fall / 0.5) * 70;
        } else if (e.fate === 'pass') {
            x = LENGTH + 34;
            y += Math.min(1, e.fall / 0.5) * 70;
        }
        g.fillStyle = e.bad ? '#8a7a66' : '#f6ead5';
        g.strokeStyle = e.bad ? '#5b4e3f' : '#cdb894';
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(X(x), Y(y), EGG_R * 0.8 * s, EGG_R * s, 0, 0, Math.PI * 2);
        g.fill();
        g.stroke();
    }

    const wrong = belt.rejectedGood + belt.passedBad;
    g.textAlign = 'left';
    g.fillStyle = wrong ? '#b5523b' : '#3d3a35';
    g.font = font(12);
    g.fillText(text.score, X(-8), Y(12));
};

/**
 * @param {object} props Component props.
 * @param {object} props.belt The simulator's belt state.
 * @returns {React.ReactElement} The belt drawing.
 */
const EggBelt = ({belt}) => {
    const intl = useIntl();
    const canvasRef = useRef(null);
    const wrong = belt.rejectedGood + belt.passedBad;
    const score = intl.formatMessage(messages.score, {bad: belt.rejectedBad, good: belt.passedGood}) +
        (wrong ? ` · ${intl.formatMessage(messages.wrong, {wrong})}` : '');

    useEffect(() => {
        if (!canvasRef.current) return;
        paintBelt(canvasRef.current, belt, {
            motor: intl.formatMessage(messages.motor),
            rejectBin: intl.formatMessage(messages.rejectBin),
            goodBin: intl.formatMessage(messages.goodBin),
            servo: intl.formatMessage(messages.servo, {angle: Math.round(belt.gate)}),
            eye: intl.formatMessage(messages.eye, {value: belt.ir}),
            score
        });
    }, [belt, intl, score]);

    return (
        <canvas
            aria-label={`${intl.formatMessage(messages.label)}: ${score}`}
            className={styles.belt}
            ref={canvasRef}
            role="img"
        />
    );
};

EggBelt.propTypes = {
    belt: PropTypes.shape({
        moved: PropTypes.number.isRequired,
        rejectedBad: PropTypes.number.isRequired,
        passedGood: PropTypes.number.isRequired,
        rejectedGood: PropTypes.number.isRequired,
        passedBad: PropTypes.number.isRequired,
        ir: PropTypes.number.isRequired,
        gate: PropTypes.number.isRequired,
        eggs: PropTypes.arrayOf(PropTypes.shape({
            x: PropTypes.number,
            bad: PropTypes.bool,
            fate: PropTypes.oneOf([null, 'reject', 'pass']),
            fall: PropTypes.number
        })).isRequired
    }).isRequired
};

export default EggBelt;
