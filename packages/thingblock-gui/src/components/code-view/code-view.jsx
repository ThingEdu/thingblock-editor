import React, {useMemo} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-arduino';
import 'prismjs/components/prism-javascript';
import {defineMessages, useIntl} from 'react-intl';
import PaneChevron from '../pane-header/pane-chevron.jsx';
import styles from './code-view.css';

const messages = defineMessages({
    title: {
        id: 'gui.codeView.title',
        defaultMessage: 'Generated Code',
        description: 'Title of the side pane that shows the Arduino code generated from the blocks'
    },
    toggle: {
        id: 'gui.codeView.toggle',
        defaultMessage: 'Show or hide the generated code',
        description: 'Tooltip of the header that opens or closes the generated code pane'
    }
});

const CodeView = ({code, language, collapsed = false, onToggle}) => {
    const intl = useIntl();
    const highlighted = useMemo(() => {
        if (collapsed) return '';
        const lang = language || 'javascript';
        const grammar = Prism.languages[lang];
        if (!grammar || !code) return code || '';
        return Prism.highlight(code, grammar, lang);
    }, [code, language, collapsed]);

    const lineCount = useMemo(() => (code || '').split('\n').length, [code]);
    const title = intl.formatMessage(messages.title);

    return (
        <div className={classNames(styles.codeView, {[styles.collapsed]: collapsed})}>
            {onToggle ? (
                <button
                    aria-expanded={!collapsed}
                    className={classNames(styles.header, styles.toggle)}
                    title={intl.formatMessage(messages.toggle)}
                    type="button"
                    onClick={onToggle}
                >
                    <PaneChevron open={!collapsed} />
                    <span>{title}</span>
                </button>
            ) : (
                <div className={styles.header}>{title}</div>
            )}
            {!collapsed && (
                <div className={styles.content}>
                    <div className={styles.gutter}>
                        {Array.from({length: lineCount}, (_, i) => (
                            <div
                                key={i}
                                className={styles.lineNumber}
                            >{i + 1}</div>
                        ))}
                    </div>
                    <pre className={styles.pre}>
                        <code
                            className={`language-${language || 'javascript'}`}
                            // eslint-disable-next-line react/no-danger
                            dangerouslySetInnerHTML={{__html: highlighted}}
                        />
                    </pre>
                </div>
            )}
        </div>
    );
};

CodeView.propTypes = {
    code: PropTypes.string,
    collapsed: PropTypes.bool,
    language: PropTypes.string,
    onToggle: PropTypes.func
};

export default CodeView;
