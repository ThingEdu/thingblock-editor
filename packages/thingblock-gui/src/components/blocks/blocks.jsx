import PropTypes from 'prop-types';
import React from 'react';
import Box from '../box/box.jsx';
import styles from './blocks.css';

const BlocksComponent = props => {
    const {
        containerRef,
        ...componentProps
    } = props;
    return (
        <Box
            className={styles.blocks}
            {...componentProps}
            componentRef={containerRef}
        />
    );
};
BlocksComponent.propTypes = {
    containerRef: PropTypes.func
};
export default BlocksComponent;
