import PropTypes from 'prop-types';
import React from 'react';
import styles from './left-panel.css';

/** Column left of the editor that holds the active left-side pane. */
const LeftPanel = ({children}) => (
    <div className={styles.leftPanel}>{children}</div>
);

LeftPanel.propTypes = {
    children: PropTypes.node.isRequired
};

export default LeftPanel;
