import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, useIntl} from 'react-intl';

import styles from './sim-panel.css';

const messages = defineMessages({
    title: {
        id: 'gui.simPanel.title',
        defaultMessage: 'Simulator',
        description: 'Heading of the simulator panel'
    },
    unavailable: {
        id: 'gui.simPanel.unavailable',
        defaultMessage: '{device} has no simulator yet. Upload the program to the board to see it run.',
        description: 'Shown in the simulator panel when the selected board cannot be simulated'
    }
});

/**
 * The simulator panel for a board the simulator does not model: its header and a short note, so the
 * learner knows why there is no virtual board and how to run the program instead.
 * @param {object} props Component props.
 * @param {string} props.device The board's name.
 * @returns {React.ReactElement} The panel.
 */
const SimUnavailable = ({device}) => {
    const intl = useIntl();
    return (
        <div className={styles.simPanel}>
            <div className={styles.header}>
                <span className={styles.title}>{intl.formatMessage(messages.title)}</span>
            </div>
            <p
                className={styles.unavailable}
                role="status"
            >
                {intl.formatMessage(messages.unavailable, {device})}
            </p>
        </div>
    );
};

SimUnavailable.propTypes = {
    device: PropTypes.string.isRequired
};

export default SimUnavailable;
