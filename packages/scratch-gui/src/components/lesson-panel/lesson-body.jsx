import PropTypes from 'prop-types';
import React from 'react';

const Runs = ({runs}) => runs.map((run, i) => {
    if (run.bold) return <strong key={i}>{run.text}</strong>;
    if (run.italic) return <em key={i}>{run.text}</em>;
    return <React.Fragment key={i}>{run.text}</React.Fragment>;
});

Runs.propTypes = {
    runs: PropTypes.arrayOf(PropTypes.shape({
        text: PropTypes.string.isRequired,
        bold: PropTypes.bool,
        italic: PropTypes.bool
    })).isRequired
};

/**
 * Render a step's parsed Markdown segments; image sources are relative to the lesson's folder.
 */
const LessonBody = ({segments, baseUrl}) => segments.map((seg, i) => {
    if (seg.type === 'img') {
        return (<img
            key={i}
            alt={seg.alt}
            src={baseUrl + seg.src}
        />);
    }
    if (seg.type === 'list') {
        return (
            <ul key={i}>
                {seg.items.map((item, j) => <li key={j}><Runs runs={item} /></li>)}
            </ul>
        );
    }
    return <p key={i}><Runs runs={seg.runs} /></p>;
});

LessonBody.propTypes = {
    segments: PropTypes.arrayOf(PropTypes.object).isRequired,
    baseUrl: PropTypes.string.isRequired
};

export {LessonBody as default, Runs};
