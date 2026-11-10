import {useCallback, useState} from 'react';

/**
 * Where a side pane's open/closed state is kept, per pane.
 * @param pane
 */
const storageKey = pane => `thingblock.pane.${pane}.collapsed`;

/**
 * Read whether a side pane was left collapsed. Storage can be missing or throw (private windows,
 * blocked site data); then the pane starts in its default state.
 * @param {string} pane The pane's name, e.g. `code` or `serial`.
 * @param {boolean} fallback The state to use when nothing is stored.
 * @returns {boolean} Whether the pane is collapsed.
 */
export const readCollapsed = (pane, fallback) => {
    try {
        const stored = window.localStorage.getItem(storageKey(pane));
        if (stored === 'true') return true;
        if (stored === 'false') return false;
    } catch (e) {
        // Storage unavailable: use the default.
    }
    return fallback;
};

/**
 * Remember whether a side pane is collapsed; a failed write only means it is not remembered.
 * @param {string} pane The pane's name.
 * @param {boolean} collapsed Whether it is collapsed.
 */
export const writeCollapsed = (pane, collapsed) => {
    try {
        window.localStorage.setItem(storageKey(pane), String(collapsed));
    } catch (e) {
        // Storage unavailable: the state lasts for this session only.
    }
};

/**
 * A side pane's collapsed state, remembered across reloads, like a VS Code side bar section.
 * @param {string} pane The pane's name.
 * @param {boolean} fallback Whether it starts collapsed when nothing is stored.
 * @returns {[boolean, Function]} The state and a function that toggles it.
 */
export const usePaneCollapsed = (pane, fallback) => {
    const [collapsed, setCollapsed] = useState(() => readCollapsed(pane, fallback));
    const toggle = useCallback(() => {
        setCollapsed(current => {
            writeCollapsed(pane, !current);
            return !current;
        });
    }, [pane]);
    return [collapsed, toggle];
};
