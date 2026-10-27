import PropTypes from 'prop-types';
import React, {useCallback} from 'react';
import classNames from 'classnames';
import {FormattedMessage} from 'react-intl';

import styles from './peripheral-card.css';

/**
 * A single entry in the peripheral library. Clicking toggles the peripheral on/off for the project,
 * except when it is `locked` — provided by the selected device and therefore always included.
 */
const PeripheralCard = ({active, description, iconURL, id, locked, name, onToggle}) => {
    const handleClick = useCallback(() => {
        if (!locked) onToggle(id);
    }, [locked, id, onToggle]);

    let action;
    if (locked) {
        action = (
            <FormattedMessage
                defaultMessage="Included"
                description="Label on a peripheral the selected device always provides"
                id="gui.peripheralCard.included"
            />
        );
    } else if (active) {
        action = (
            <FormattedMessage
                defaultMessage="Remove"
                description="Action to remove a user-added peripheral from the project"
                id="gui.peripheralCard.remove"
            />
        );
    } else {
        action = (
            <FormattedMessage
                defaultMessage="Add"
                description="Action to add a peripheral to the project"
                id="gui.peripheralCard.add"
            />
        );
    }

    return (
        <div
            className={classNames(styles.card, {
                [styles.active]: active,
                [styles.locked]: locked
            })}
        >
            <button
                className={styles.selectButton}
                type="button"
                disabled={locked}
                onClick={handleClick}
            >
                <div className={styles.imageContainer}>
                    {iconURL && (
                        <img
                            alt=""
                            className={styles.image}
                            draggable={false}
                            src={iconURL}
                        />
                    )}
                </div>
                <div className={styles.text}>
                    <span className={styles.name}>{name}</span>
                    {description && <span className={styles.description}>{description}</span>}
                </div>
                <div
                    className={classNames(styles.action, {
                        [styles.actionActive]: active
                    })}
                >
                    {action}
                </div>
            </button>
        </div>
    );
};

PeripheralCard.propTypes = {
    active: PropTypes.bool,
    description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    iconURL: PropTypes.string,
    id: PropTypes.string.isRequired,
    locked: PropTypes.bool,
    name: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    onToggle: PropTypes.func.isRequired
};

export default PeripheralCard;
