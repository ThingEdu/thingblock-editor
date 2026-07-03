import React, {useState, useCallback, useEffect, useLayoutEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {defineMessages, FormattedMessage, useIntl} from 'react-intl';
import styles from './serial-log.css';

const MIN_HEIGHT = 48;
const MAX_HEIGHT = 500;
const DEFAULT_HEIGHT = 280;

// Standard Arduino serial baud rates, slowest to fastest.
const BAUD_RATES = [
    300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880,
    115200, 230400, 250000, 500000, 1000000, 2000000
];

const messages = defineMessages({
    clearMonitor: {
        id: 'gui.serialLog.clearMonitor',
        defaultMessage: 'Clear monitor',
        description: 'Accessible label for the button that clears all messages from the serial monitor'
    },
    monitor: {
        id: 'gui.serialLog.monitor',
        defaultMessage: 'Monitor',
        description: 'Title for the serial monitor panel'
    },
    baudRate: {
        id: 'gui.serialLog.baudRate',
        defaultMessage: 'Serial monitor baud rate',
        description: 'Accessible label for the dropdown that selects the serial monitor baud rate'
    },
    baudOption: {
        id: 'gui.serialLog.baudOption',
        defaultMessage: '{rate} baud',
        description: 'Label for a baud-rate option in the serial monitor, e.g. "115200 baud"'
    },
    send: {
        id: 'gui.serialLog.send',
        defaultMessage: 'Send',
        description: 'Button label for sending a message from the serial monitor'
    },
    sendPlaceholder: {
        id: 'gui.serialLog.sendPlaceholder',
        defaultMessage: 'Send message...',
        description: 'Placeholder text for the serial monitor message input'
    },
    promptedInputPlaceholder: {
        id: 'gui.serialLog.promptedInputPlaceholder',
        defaultMessage: 'Type your answer...',
        description: 'Placeholder text for the monitor input when the program is waiting for a response'
    },
    jumpToLatest: {
        id: 'gui.serialLog.jumpToLatest',
        defaultMessage: 'Latest',
        description: 'Label for the button that scrolls the serial monitor back to the newest output'
    },
    jumpToLatestLabel: {
        id: 'gui.serialLog.jumpToLatestLabel',
        defaultMessage: 'Scroll to latest output',
        description: 'Accessible label for the button that scrolls the serial monitor to the newest output'
    }
});

// Distance in pixels from the bottom within which the view still counts as "pinned" to the
// newest line; absorbs sub-pixel scroll rounding.
const BOTTOM_THRESHOLD = 16;

const SerialLog = ({
    logs = [],
    fill = false,
    baudRate = 115200,
    baudDisabled = false,
    onBaudChange,
    onClear,
    onSend,
    prompt
}) => {
    const intl = useIntl();
    const hasPrompt = prompt !== null && typeof prompt !== 'undefined';
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [inputValue, setInputValue] = useState('');
    const [atBottom, setAtBottom] = useState(true);
    const inputRef = useRef(null);
    const contentRef = useRef(null);
    // Mirror of atBottom the pin effect can read without re-running when only atBottom changes
    // (e.g. after a smooth jump), which would otherwise clobber the smooth scroll with a jump.
    const atBottomRef = useRef(true);
    atBottomRef.current = atBottom;

    // Clear and focus the input when a prompt arrives.
    useEffect(() => {
        if (hasPrompt) {
            setInputValue('');
            if (inputRef.current) inputRef.current.focus();
        }
    }, [hasPrompt, prompt]);

    // Pin the view to the newest line as logs stream in, unless the user has scrolled up.
    // useLayoutEffect scrolls before paint so the newest line never visibly flickers.
    useLayoutEffect(() => {
        const el = contentRef.current;
        if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
    }, [logs]);

    const handleScroll = useCallback(() => {
        const el = contentRef.current;
        if (!el) return;
        setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD);
    }, []);

    const handleJumpToLatest = useCallback(() => {
        const el = contentRef.current;
        if (el) el.scrollTo({top: el.scrollHeight, behavior: 'smooth'});
        setAtBottom(true);
    }, []);

    const handleResizeMouseDown = useCallback(e => {
        const startY = e.clientY;
        const startHeight = height;
        const onMouseMove = moveEvent => {
            const delta = startY - moveEvent.clientY;
            setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + delta)));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    }, [height]);

    const handleSend = useCallback(() => {
        // Empty input is valid when responding to a prompt
        const hasContent = hasPrompt || inputValue.trim().length > 0;
        if (hasContent && onSend) {
            onSend(inputValue);
            setInputValue('');
        }
    }, [hasPrompt, inputValue, onSend]);

    const handleInputChange = useCallback(e => {
        setInputValue(e.target.value);
    }, []);

    const handleKeyDown = useCallback(e => {
        if (e.key === 'Enter') handleSend();
    }, [handleSend]);

    const handleBaudChange = useCallback(e => {
        if (onBaudChange) onBaudChange(Number(e.target.value));
    }, [onBaudChange]);

    return (
        <div
            className={classNames(styles.serialLog, {[styles.fill]: fill})}
            style={fill ? null : {height: `${height}px`}}
        >
            <div
                className={styles.resizeHandle}
                onMouseDown={fill ? null : handleResizeMouseDown}
            />
            <div className={styles.inner}>
                <div className={styles.header}>
                    <span><FormattedMessage {...messages.monitor} /></span>
                    <div className={styles.headerActions}>
                        <select
                            className={styles.baudSelect}
                            value={baudRate}
                            disabled={baudDisabled}
                            onChange={handleBaudChange}
                            aria-label={intl.formatMessage(messages.baudRate)}
                        >
                            {BAUD_RATES.map(rate => (
                                <option
                                    key={rate}
                                    value={rate}
                                >
                                    {intl.formatMessage(messages.baudOption, {rate})}
                                </option>
                            ))}
                        </select>
                        <button
                            className={styles.clearButton}
                            disabled={!onClear || logs.length === 0}
                            onClick={onClear}
                            aria-label={intl.formatMessage(messages.clearMonitor)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4h6v2" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className={styles.contentWrap}>
                    <div
                        ref={contentRef}
                        className={styles.content}
                        onScroll={handleScroll}
                    >
                        {logs && logs.map((entry, i) => (
                            <div
                                key={i}
                                className={styles.entry}
                            >
                                {entry.message}
                            </div>
                        ))}
                    </div>
                    {!atBottom && (
                        <button
                            className={styles.jumpButton}
                            onClick={handleJumpToLatest}
                            aria-label={intl.formatMessage(messages.jumpToLatestLabel)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                            <FormattedMessage {...messages.jumpToLatest} />
                        </button>
                    )}
                </div>
                {hasPrompt && (
                    <div className={styles.promptBanner}>{prompt}</div>
                )}
                <div className={styles.inputRow}>
                    <input
                        ref={inputRef}
                        className={styles.input}
                        type="text"
                        value={inputValue}
                        placeholder={intl.formatMessage(
                            hasPrompt ? messages.promptedInputPlaceholder : messages.sendPlaceholder
                        )}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        className={styles.sendButton}
                        onClick={handleSend}
                    >
                        <FormattedMessage {...messages.send} />
                    </button>
                </div>
            </div>
        </div>
    );
};

SerialLog.propTypes = {
    logs: PropTypes.arrayOf(PropTypes.shape({
        message: PropTypes.string
    })),
    fill: PropTypes.bool,
    baudRate: PropTypes.number,
    baudDisabled: PropTypes.bool,
    onBaudChange: PropTypes.func,
    onClear: PropTypes.func,
    onSend: PropTypes.func,
    prompt: PropTypes.string
};

export default SerialLog;
