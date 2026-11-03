/**
 * Yes/no questions that work in the desktop app as well as in a browser.
 *
 * In the desktop app the dialog plugin replaces `window.confirm` with an async version, so a plain
 * `if (!confirm(...))` sees a Promise (always truthy) and never waits for the answer. Ask through
 * `confirmAsync` instead and await it: the desktop app shows its own native dialog with the button
 * labels given here; a browser uses `window.confirm`.
 */

import sharedMessages from './shared-messages';

const tauri = () => (typeof window === 'undefined' ? null : window.__TAURI_INTERNALS__ || null);

/**
 * Ask the user to confirm.
 * @param {string} message - the question.
 * @param {object} [options] - dialog options (desktop app only).
 * @param {string} [options.title] - the dialog title.
 * @param {string} [options.okLabel] - the label of the confirming button.
 * @param {string} [options.cancelLabel] - the label of the cancelling button.
 * @returns {Promise<boolean>} true when the user confirmed.
 */
const confirmAsync = async (message, {title = 'ThingBlock', okLabel = 'OK', cancelLabel = 'Cancel'} = {}) => {
    const ipc = tauri();
    if (ipc) {
        try {
            return (await ipc.invoke('confirm_dialog', {message, title, okLabel, cancelLabel})) === true;
        } catch (error) {
            // An app without the command: fall back to the plugin's (async) confirm.
            return (await window.confirm(message)) === true; // eslint-disable-line no-alert
        }
    }
    return window.confirm(message) === true; // eslint-disable-line no-alert
};

/**
 * Ask whether to replace the open project (and lose its unsaved changes).
 * @param {object} intl - react-intl's intl object, for the localized texts.
 * @param {string} [message] - the question; defaults to the shared "replace project" warning.
 * @returns {Promise<boolean>} true when the user chose to replace it.
 */
const confirmReplaceProject = (intl, message = intl.formatMessage(sharedMessages.replaceProjectWarning)) =>
    confirmAsync(message, {
        title: 'ThingBlock',
        okLabel: intl.formatMessage(sharedMessages.replaceProjectConfirm),
        cancelLabel: intl.formatMessage(sharedMessages.cancel)
    });

export {
    confirmAsync,
    confirmReplaceProject
};
