import React, {useCallback, useContext} from 'react';
import classNames from 'classnames';
import {defineMessages, injectIntl} from 'react-intl';
import intlShape from '../../lib/intlShape.js';
import PropTypes from 'prop-types';

import Box from '../box/box.jsx';
import addExtensionIcon from '../gui/icon--extensions.svg';
import styles from './extension-button.css';
import {ModalFocusContext} from '../../contexts/modal-focus-context.jsx';

const messages = defineMessages({
    addExtension: {
        id: 'gui.gui.addExtension',
        description: 'Button to add an extension in the target pane',
        defaultMessage: 'Add Extension'
    },
    addPeripheral: {
        id: 'gui.gui.addPeripheral',
        description: 'Button to add a hardware peripheral when a board is selected',
        defaultMessage: 'Add Peripheral'
    }
});

const ExtensionButton = props => {
    const {
        boardMode,
        intl,
        onExtensionButtonClick
    } = props;
    const {captureFocus} = useContext(ModalFocusContext);

    const handleExtensionButtonClick = useCallback(() => {
        captureFocus();
        onExtensionButtonClick?.();
    }, [captureFocus, onExtensionButtonClick]);

    // In board mode the button opens the peripheral library instead of the extension library.
    const label = intl.formatMessage(boardMode ? messages.addPeripheral : messages.addExtension);

    return (
        <Box className={styles.extensionButtonContainer}>
            <button
                className={classNames(styles.extensionButton)}
                title={label}
                onClick={handleExtensionButtonClick}
                aria-label={label}
            >
                <img
                    className={styles.extensionButtonIcon}
                    draggable={false}
                    src={addExtensionIcon}
                />
            </button>
        </Box>
    );
};

ExtensionButton.propTypes = {
    boardMode: PropTypes.bool,
    intl: intlShape.isRequired,
    onExtensionButtonClick: PropTypes.func
};

const ExtensionButtonIntl = injectIntl(ExtensionButton);

export default ExtensionButtonIntl;
