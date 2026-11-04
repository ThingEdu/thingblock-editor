import PropTypes from 'prop-types';
import React from 'react';

/**
 * The chevron of a collapsible side pane header: pointing right when closed, down when open.
 * @param {object} props Component props.
 * @param {boolean} props.open Whether the pane is open.
 * @returns {React.ReactElement} The icon.
 */
const PaneChevron = ({open}) => (
    <svg
        aria-hidden="true"
        fill="none"
        height="12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
        style={{transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.12s ease', flexShrink: 0}}
        viewBox="0 0 24 24"
        width="12"
    >
        <polyline points="9 6 15 12 9 18" />
    </svg>
);

PaneChevron.propTypes = {
    open: PropTypes.bool.isRequired
};

export default PaneChevron;
