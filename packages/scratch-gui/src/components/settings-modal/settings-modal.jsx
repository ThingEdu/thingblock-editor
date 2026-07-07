import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, FormattedMessage} from 'react-intl';

import intlShape from '../../lib/intlShape.js';
import {LINK_MODE, CLOUD_MODE} from '../../lib/settings/link-mode';
import Box from '../box/box.jsx';
import Modal from '../modal/modal.jsx';

import styles from './settings-modal.css';

const messages = defineMessages({
    title: {
        id: 'gui.settingsModal.title',
        defaultMessage: 'Settings',
        description: 'Settings modal title and accessibility label'
    },
    linkTab: {
        id: 'gui.settingsModal.linkTab',
        defaultMessage: 'Link',
        description: 'Sidebar label for the device-link settings section'
    },
    linkHeading: {
        id: 'gui.settingsModal.linkHeading',
        defaultMessage: 'Connection mode',
        description: 'Heading for the device-link mode selector'
    },
    linkDescription: {
        id: 'gui.settingsModal.linkDescription',
        defaultMessage: 'Choose how the editor builds firmware and connects to your board.',
        description: 'Sub-heading explaining the device-link mode selector'
    },
    linkClient: {
        id: 'gui.settingsModal.linkClient',
        defaultMessage: 'Link client',
        description: 'Label for the native-helper device-link option'
    },
    linkClientDescription: {
        id: 'gui.settingsModal.linkClientDescription',
        defaultMessage: 'Build and flash through the local helper app on your computer.',
        description: 'Description of the native-helper device-link option'
    },
    cloudClient: {
        id: 'gui.settingsModal.cloudClient',
        defaultMessage: 'Cloud client',
        description: 'Label for the web/cloud device-link option'
    },
    cloudClientDescription: {
        id: 'gui.settingsModal.cloudClientDescription',
        defaultMessage: 'Not available yet — building and flashing from the browser over ' +
            'Web Serial is coming in a future update.',
        description: 'Description of the web/cloud device-link option, currently unavailable'
    },
    cloudClientBadge: {
        id: 'gui.settingsModal.cloudClientBadge',
        defaultMessage: 'Coming soon',
        description: 'Badge shown next to a device-link option that is not yet available'
    }
});

const SettingsModal = ({intl, isRtl, linkMode, onRequestClose, onSetLinkMode}) => {
    const handleSelect = mode => () => onSetLinkMode(mode);
    const options = [
        {mode: LINK_MODE, label: messages.linkClient, description: messages.linkClientDescription},
        {
            mode: CLOUD_MODE,
            label: messages.cloudClient,
            description: messages.cloudClientDescription,
            disabled: true
        }
    ];
    return (
        <Modal
            className={styles.modalContent}
            contentLabel={intl.formatMessage(messages.title)}
            isRtl={isRtl}
            onRequestClose={onRequestClose}
        >
            <Box className={styles.body}>
                <div className={styles.sidebar}>
                    <button className={classNames(styles.tab, styles.tabActive)}>
                        <FormattedMessage {...messages.linkTab} />
                    </button>
                </div>
                <div className={styles.content}>
                    <div className={styles.contentHeading}>
                        <FormattedMessage {...messages.linkHeading} />
                    </div>
                    <div className={styles.contentDescription}>
                        <FormattedMessage {...messages.linkDescription} />
                    </div>
                    <div className={styles.options}>
                        {options.map(option => (
                            <label
                                key={option.mode}
                                className={classNames(styles.option, {
                                    [styles.optionSelected]: linkMode === option.mode,
                                    [styles.optionDisabled]: option.disabled
                                })}
                            >
                                <input
                                    className={styles.optionRadio}
                                    disabled={option.disabled}
                                    name="linkMode"
                                    type="radio"
                                    value={option.mode}
                                    checked={linkMode === option.mode}
                                    onChange={handleSelect(option.mode)}
                                />
                                <span className={styles.optionText}>
                                    <span className={styles.optionLabel}>
                                        <FormattedMessage {...option.label} />
                                        {option.disabled && (
                                            <span className={styles.optionBadge}>
                                                <FormattedMessage {...messages.cloudClientBadge} />
                                            </span>
                                        )}
                                    </span>
                                    <span className={styles.optionDescription}>
                                        <FormattedMessage {...option.description} />
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </Box>
        </Modal>
    );
};

SettingsModal.propTypes = {
    intl: intlShape.isRequired,
    isRtl: PropTypes.bool,
    linkMode: PropTypes.string.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    onSetLinkMode: PropTypes.func.isRequired
};

export default injectIntl(SettingsModal);
