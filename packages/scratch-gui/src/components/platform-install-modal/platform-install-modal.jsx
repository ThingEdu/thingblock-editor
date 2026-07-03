import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import classNames from 'classnames';
import {defineMessages, useIntl} from 'react-intl';

import Modal from '../../containers/modal.jsx';

import styles from './platform-install-modal.css';

const messages = defineMessages({
    title: {
        id: 'gui.platformInstallModal.title',
        defaultMessage: 'Board package',
        description: 'Title of the modal that offers to download a missing board package and shows its progress'
    },
    prompt: {
        id: 'gui.platformInstallModal.prompt',
        defaultMessage: 'The {name} board package isn’t installed. Download it now? This may take several minutes.',
        description: 'Question shown when the selected board needs a package that is not installed yet'
    },
    installing: {
        id: 'gui.platformInstallModal.installing',
        defaultMessage: 'Downloading the {name} board package…',
        description: 'Status shown while the board package is being downloaded and installed'
    },
    done: {
        id: 'gui.platformInstallModal.done',
        defaultMessage: 'The {name} board package is ready.',
        description: 'Status shown when the board package finished installing'
    },
    cancelled: {
        id: 'gui.platformInstallModal.cancelled',
        defaultMessage: 'Download stopped.',
        description: 'Status shown when the user stopped the board package download'
    },
    error: {
        id: 'gui.platformInstallModal.error',
        defaultMessage: 'Download didn’t finish.',
        description: 'Status shown when the board package download failed'
    },
    showDetails: {
        id: 'gui.platformInstallModal.showDetails',
        defaultMessage: 'Details',
        description: 'Toggle that reveals the raw board package install log'
    },
    notNow: {
        id: 'gui.platformInstallModal.notNow',
        defaultMessage: 'Not now',
        description: 'Button that dismisses the board package download offer'
    },
    install: {
        id: 'gui.platformInstallModal.install',
        defaultMessage: 'Download',
        description: 'Button that starts the board package download'
    },
    cancel: {
        id: 'gui.platformInstallModal.cancel',
        defaultMessage: 'Stop',
        description: 'Button that aborts the in-progress board package download'
    },
    close: {
        id: 'gui.platformInstallModal.close',
        defaultMessage: 'Close',
        description: 'Button that closes the board package modal once it has finished'
    }
});

const STATUS_MESSAGES = {
    prompt: messages.prompt,
    installing: messages.installing,
    done: messages.done,
    cancelled: messages.cancelled,
    error: messages.error
};

const CheckIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            d="M5 12.5l4.5 4.5L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const DownloadIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const PlatformInstallModal = ({
    status,
    platformName,
    progress = null,
    logs = [],
    error = null,
    onInstall,
    onCancel,
    onClose
}) => {
    const intl = useIntl();
    const logRef = useRef(null);
    const [showDetails, setShowDetails] = useState(false);

    const joined = logs.join('').trim();
    const handleToggleDetails = useCallback(() => setShowDetails(open => !open), []);

    // Calm the panel on success; surface the cause on failure.
    useEffect(() => {
        if (status === 'done' || status === 'cancelled') setShowDetails(false);
        if (status === 'error') setShowDetails(true);
    }, [status]);

    // Keep the newest output in view as chunks stream in.
    useEffect(() => {
        if (showDetails && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [joined, showDetails]);

    const installing = status === 'installing';

    // The helper streams structured per-file progress; clamp against stray values.
    const percent = installing && progress && typeof progress.percent === 'number' ?
        Math.max(0, Math.min(100, Math.round(progress.percent))) :
        null;

    return (
        <Modal
            className={styles.modalContent}
            contentLabel={intl.formatMessage(messages.title)}
            id="platformInstallModal"
            // Closing mid-install stops first so the helper isn't left downloading for a dismissed modal.
            onRequestClose={installing ? onCancel : onClose}
        >
            <div className={styles.body}>
                <div
                    className={styles.statusRow}
                    aria-live="polite"
                >
                    <div
                        className={classNames(styles.statusIcon, {
                            [styles.statusIconPrompt]: status === 'prompt',
                            [styles.statusIconRunning]: installing,
                            [styles.statusIconDone]: status === 'done',
                            [styles.statusIconError]: status === 'error',
                            [styles.statusIconCancelled]: status === 'cancelled'
                        })}
                    >
                        {status === 'prompt' && <DownloadIcon />}
                        {installing && <span className={styles.spinner} />}
                        {status === 'done' && <CheckIcon />}
                        {status === 'error' && <span className={styles.glyph}>{'!'}</span>}
                        {status === 'cancelled' && <span className={styles.glyph}>{'–'}</span>}
                    </div>
                    <div className={styles.statusText}>
                        {STATUS_MESSAGES[status] &&
                            intl.formatMessage(STATUS_MESSAGES[status], {name: platformName})}
                    </div>
                </div>

                {installing && (
                    <div
                        className={styles.progressTrack}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        // Determinate phases report a value; an indeterminate bar omits it.
                        {...(percent === null ? {} : {'aria-valuenow': percent})}
                    >
                        {percent === null ? (
                            <div className={styles.progressIndeterminate} />
                        ) : (
                            <div
                                className={styles.progressBar}
                                style={{width: `${percent}%`}}
                            >
                                <span className={styles.progressValue}>{`${percent}%`}</span>
                            </div>
                        )}
                    </div>
                )}

                {installing && progress && progress.phase && (
                    <div className={styles.phase}>{progress.phase}</div>
                )}

                {status === 'error' && error && (
                    <div className={styles.errorDetail}>{error}</div>
                )}

                {joined && (
                    <div className={styles.details}>
                        <button
                            className={styles.detailsToggle}
                            aria-expanded={showDetails}
                            onClick={handleToggleDetails}
                        >
                            <span className={classNames(styles.chevron, {[styles.chevronOpen]: showDetails})}>
                                {'▸'}
                            </span>
                            {intl.formatMessage(messages.showDetails)}
                        </button>
                        {showDetails && (
                            <pre
                                className={styles.log}
                                ref={logRef}
                            >
                                {joined}
                            </pre>
                        )}
                    </div>
                )}

                <div className={styles.footer}>
                    {status === 'prompt' ? (
                        <React.Fragment>
                            <button
                                className={classNames(styles.actionButton, styles.actionButtonSecondary)}
                                onClick={onClose}
                            >
                                {intl.formatMessage(messages.notNow)}
                            </button>
                            <button
                                className={styles.actionButton}
                                onClick={onInstall}
                            >
                                {intl.formatMessage(messages.install)}
                            </button>
                        </React.Fragment>
                    ) : (
                        <button
                            className={classNames(styles.actionButton, {
                                [styles.actionButtonDanger]: installing
                            })}
                            onClick={installing ? onCancel : onClose}
                        >
                            {intl.formatMessage(installing ? messages.cancel : messages.close)}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

PlatformInstallModal.propTypes = {
    error: PropTypes.string,
    logs: PropTypes.arrayOf(PropTypes.string),
    onCancel: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onInstall: PropTypes.func.isRequired,
    platformName: PropTypes.string,
    progress: PropTypes.shape({
        phase: PropTypes.string,
        percent: PropTypes.number
    }),
    status: PropTypes.oneOf(['prompt', 'installing', 'done', 'cancelled', 'error'])
};

export default PlatformInstallModal;
