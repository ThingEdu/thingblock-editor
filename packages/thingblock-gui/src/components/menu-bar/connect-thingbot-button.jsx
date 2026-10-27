import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import styles from './connect-thingbot-button.css';

const ConnectThingbotButton = ({className, connected, connecting, onClick}) => (
    <button
        className={classNames(className, {
            [styles.connecting]: connecting,
            [styles.connected]: connected
        })}
        onClick={onClick}
    >
        {(connected || connecting) && <span className={styles.indicator} />}
        {connected ? (
            <FormattedMessage
                defaultMessage="ThingBot · Connected"
                description="Menu bar button label when the ThingBot is connected"
                id="gui.menuBar.thingbotConnected"
            />
        ) : connecting ? (
            <FormattedMessage
                defaultMessage="ThingBot · Connecting…"
                description="Menu bar button label while connecting to the ThingBot"
                id="gui.menuBar.thingbotConnecting"
            />
        ) : (
            <FormattedMessage
                defaultMessage="Connect ThingBot"
                description="Menu bar button that opens the ThingBot connection dialog"
                id="gui.menuBar.connectThingbot"
            />
        )}
    </button>
);

ConnectThingbotButton.propTypes = {
    className: PropTypes.string,
    connected: PropTypes.bool,
    connecting: PropTypes.bool,
    onClick: PropTypes.func.isRequired
};

ConnectThingbotButton.defaultProps = {
    connected: false,
    connecting: false
};

export default ConnectThingbotButton;
