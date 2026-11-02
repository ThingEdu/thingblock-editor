import PropTypes from 'prop-types';
import React, {useCallback} from 'react';

import styles from './example-card.css';

/**
 * One bundled example project in the example library: its group, title, summary and the hardware
 * it needs. The text comes from the example index as written (the examples are Vietnamese lessons).
 * @param {object} props - component props.
 * @returns {React.ReactElement} the card.
 */
const ExampleCard = ({description, group, hardware = [], itemKey, level = 1, name, onSelect}) => {
    const handleSelect = useCallback(() => onSelect(itemKey), [onSelect, itemKey]);
    return (
        <div className={styles.card}>
            <button
                className={styles.selectButton}
                type="button"
                onClick={handleSelect}
            >
                <span className={styles.group}>{`${group} · ${'★'.repeat(level)}`}</span>
                <span className={styles.name}>{name}</span>
                <span className={styles.description}>{description}</span>
                {hardware.length > 0 && (
                    <ul className={styles.hardware}>
                        {hardware.map(part => <li key={part}>{part}</li>)}
                    </ul>
                )}
            </button>
        </div>
    );
};

ExampleCard.propTypes = {
    description: PropTypes.string,
    group: PropTypes.string,
    hardware: PropTypes.arrayOf(PropTypes.string),
    itemKey: PropTypes.string.isRequired,
    level: PropTypes.number,
    name: PropTypes.string.isRequired,
    onSelect: PropTypes.func.isRequired
};

export default ExampleCard;
