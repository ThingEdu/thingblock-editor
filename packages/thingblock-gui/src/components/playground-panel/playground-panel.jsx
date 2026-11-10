import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, useIntl} from 'react-intl';

import styles from './playground-panel.css';

const messages = defineMessages({
    title: {
        id: 'gui.playgroundPanel.title',
        defaultMessage: 'Playground',
        description: 'Title of the panel that shows the webcam and the Camera AI playground'
    },
    cameraOn: {
        id: 'gui.playgroundPanel.cameraOn',
        defaultMessage: 'Camera',
        description: 'Button that turns the webcam on'
    },
    cameraOff: {
        id: 'gui.playgroundPanel.cameraOff',
        defaultMessage: 'Stop',
        description: 'Button that turns the webcam off'
    },
    cameraOnTip: {
        id: 'gui.playgroundPanel.cameraOnTip',
        defaultMessage: 'Turn the webcam on and start seeing hands',
        description: 'Tooltip of the button that turns the webcam on'
    },
    cameraOffTip: {
        id: 'gui.playgroundPanel.cameraOffTip',
        defaultMessage: 'Turn the webcam off',
        description: 'Tooltip of the button that turns the webcam off'
    },
    mirror: {
        id: 'gui.playgroundPanel.mirror',
        defaultMessage: 'Mirror',
        description: 'Button that flips the camera picture like a mirror'
    },
    mirrorTip: {
        id: 'gui.playgroundPanel.mirrorTip',
        defaultMessage: 'Flip the picture like a mirror',
        description: 'Tooltip of the mirror button'
    },
    clear: {
        id: 'gui.playgroundPanel.clear',
        defaultMessage: 'Clear',
        description: 'Button that removes every object and score from the playground'
    },
    clearTip: {
        id: 'gui.playgroundPanel.clearTip',
        defaultMessage: 'Remove all objects, scores and the countdown',
        description: 'Tooltip of the clear button'
    },
    off: {
        id: 'gui.playgroundPanel.off',
        defaultMessage: 'The camera is off. Press Camera, or run a "turn camera on" block.',
        description: 'Shown on the playground while the webcam is off'
    },
    starting: {
        id: 'gui.playgroundPanel.starting',
        defaultMessage: 'Starting the camera and loading the hand model…',
        description: 'Shown on the playground while the webcam and model start'
    },
    denied: {
        id: 'gui.playgroundPanel.denied',
        defaultMessage: 'The camera was not allowed. Allow it in the browser or system settings and try again.',
        description: 'Shown when the person denied camera access'
    },
    notFound: {
        id: 'gui.playgroundPanel.notFound',
        defaultMessage: 'No camera was found on this computer.',
        description: 'Shown when the computer has no webcam'
    },
    failed: {
        id: 'gui.playgroundPanel.failed',
        defaultMessage: 'The camera could not start: {error}',
        description: 'Shown when the webcam or the model failed for another reason'
    },
    player: {
        id: 'gui.playgroundPanel.player',
        defaultMessage: 'P{n}',
        description: 'Short label of a player on the scoreboard; {n} is 1 or 2'
    },
    fps: {
        id: 'gui.playgroundPanel.fps',
        defaultMessage: '{fps} fps',
        description: 'Frames per second the hand tracker reaches'
    }
});

const ICONS = {
    camera: (
        <path
            d="M4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2.5l4-2.5v10l-4-2.5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"
        />
    ),
    stop: (
        <rect
            x="6"
            y="6"
            width="12"
            height="12"
            rx="2"
        />
    ),
    mirror: (
        <path d="M11 3h2v18h-2zM3 7l6 5-6 5zM21 7l-6 5 6 5z" />
    ),
    clear: (
        <path d="M6 7h12l-1 13H7zM9 4h6v2H9zM4 6h16v2H4z" />
    )
};

const Button = ({icon, label, tip, primary, disabled, pressed, onClick}) => (
    <button
        aria-label={label}
        aria-pressed={pressed}
        className={classNames(styles.button, {[styles.primary]: primary})}
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

Button.propTypes = {
    disabled: PropTypes.bool,
    icon: PropTypes.oneOf(Object.keys(ICONS)).isRequired,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    pressed: PropTypes.bool,
    primary: PropTypes.bool,
    tip: PropTypes.string
};

/**
 * The Camera AI playground: the webcam with the tracked hands drawn over it, the objects the
 * program created, the scoreboard and the countdown. The container owns the camera, the model
 * and the drawing; this component places the elements and the controls.
 * @param {object} props Component props.
 * @returns {React.ReactElement} The panel.
 */
const PlaygroundPanel = ({
    canvasRef,
    error,
    fps,
    mirror,
    onCameraOff,
    onCameraOn,
    onClear,
    onToggleMirror,
    playground,
    status,
    videoRef
}) => {
    const intl = useIntl();
    const on = status === 'starting' || status === 'ready';
    const showVideo = status === 'ready';

    let placeholder = null;
    if (status === 'off') placeholder = intl.formatMessage(messages.off);
    else if (status === 'starting') placeholder = intl.formatMessage(messages.starting);
    else if (status === 'error') {
        if (error && error.name === 'NotAllowedError') placeholder = intl.formatMessage(messages.denied);
        else if (error && error.name === 'NotFoundError') placeholder = intl.formatMessage(messages.notFound);
        else placeholder = intl.formatMessage(messages.failed, {error: error ? error.message : '?'});
    }

    const scoreboard = playground && playground.showScoreboard;

    return (
        <div className={styles.playgroundPanel}>
            <div className={styles.header}>
                <span className={styles.title}>
                    {intl.formatMessage(messages.title)}
                    {showVideo && fps > 0 && (
                        <span className={styles.fps}>{' · '}{intl.formatMessage(messages.fps, {fps})}</span>
                    )}
                </span>
                {on ? (
                    <Button
                        icon="stop"
                        label={intl.formatMessage(messages.cameraOff)}
                        tip={intl.formatMessage(messages.cameraOffTip)}
                        onClick={onCameraOff}
                    />
                ) : (
                    <Button
                        primary
                        icon="camera"
                        label={intl.formatMessage(messages.cameraOn)}
                        tip={intl.formatMessage(messages.cameraOnTip)}
                        onClick={onCameraOn}
                    />
                )}
                <Button
                    icon="mirror"
                    label={intl.formatMessage(messages.mirror)}
                    pressed={mirror}
                    primary={mirror}
                    tip={intl.formatMessage(messages.mirrorTip)}
                    onClick={onToggleMirror}
                />
                <Button
                    icon="clear"
                    label={intl.formatMessage(messages.clear)}
                    tip={intl.formatMessage(messages.clearTip)}
                    onClick={onClear}
                />
            </div>
            <div className={styles.stage}>
                <video
                    className={classNames(styles.video, {
                        [styles.mirrored]: mirror,
                        [styles.hidden]: !showVideo
                    })}
                    ref={videoRef}
                />
                <canvas
                    className={styles.canvas}
                    ref={canvasRef}
                />
                {placeholder && (
                    <div className={classNames(styles.placeholder, {[styles.problem]: status === 'error'})}>
                        {placeholder}
                    </div>
                )}
                {scoreboard && (
                    <div className={styles.scoreboard}>
                        <span>{intl.formatMessage(messages.player, {n: 1})}{' '}{playground.scores[0]}</span>
                        <span className={styles.player2}>
                            {intl.formatMessage(messages.player, {n: 2})}{' '}{playground.scores[1]}
                        </span>
                        {playground.timeLeft !== null && (
                            <span className={styles.timer}>{'⏱ '}{playground.timeLeft}</span>
                        )}
                    </div>
                )}
                {playground && playground.say && (
                    <div className={styles.say}>{playground.say}</div>
                )}
            </div>
        </div>
    );
};

PlaygroundPanel.propTypes = {
    canvasRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}).isRequired,
    error: PropTypes.shape({name: PropTypes.string, message: PropTypes.string}),
    fps: PropTypes.number,
    mirror: PropTypes.bool,
    onCameraOff: PropTypes.func.isRequired,
    onCameraOn: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onToggleMirror: PropTypes.func.isRequired,
    playground: PropTypes.shape({
        objects: PropTypes.array,
        scores: PropTypes.arrayOf(PropTypes.number),
        timeLeft: PropTypes.number,
        say: PropTypes.string,
        showScoreboard: PropTypes.bool
    }),
    status: PropTypes.oneOf(['off', 'starting', 'ready', 'error']).isRequired,
    videoRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}).isRequired
};

export default PlaygroundPanel;
