/**
 * Yes/no questions that work in the desktop app as well as in a browser.
 *
 * In the desktop app the dialog plugin replaces `window.confirm` with an async version, so a plain
 * `if (!confirm(...))` sees a Promise (always truthy) and never waits for the answer. Ask through
 * `confirmAsync` instead and await it: the desktop app shows its own native dialog with the button
 * labels given here; a browser uses `window.confirm`.
 */
import type { IntlShape } from 'react-intl'
import sharedMessages from '../shared-messages'

/**
 * Asks the user to confirm.
 * @param message The question.
 * @param options Dialog options, used in the desktop app only.
 * @param options.title The dialog title.
 * @param options.okLabel The label of the confirming button.
 * @param options.cancelLabel The label of the cancelling button.
 * @returns Whether the user confirmed.
 */
export const confirmAsync = async (
  message: string,
  options: { title?: string; okLabel?: string; cancelLabel?: string } = {},
): Promise<boolean> => {
  const { title = 'ThingBlock', okLabel = 'OK', cancelLabel = 'Cancel' } = options
  const ipc = window.__TAURI_INTERNALS__
  if (ipc) {
    try {
      return (await ipc.invoke('confirm_dialog', { message, title, okLabel, cancelLabel })) === true
    } catch {
      // An app without the command: fall back to the plugin's confirm, which is async although the DOM types
      // say it is not.
      const answer = window.confirm(message) as boolean | Promise<boolean>
      return await answer
    }
  }
  return window.confirm(message)
}

/**
 * Asks whether to replace the open project and lose its unsaved changes.
 * @param intl react-intl's intl object, for the localized texts.
 * @param message The question; the shared "replace project" warning when omitted.
 * @returns Whether the user chose to replace it.
 */
export const confirmReplaceProject = (
  intl: IntlShape,
  message = intl.formatMessage(sharedMessages.replaceProjectWarning),
): Promise<boolean> =>
  confirmAsync(message, {
    title: 'ThingBlock',
    okLabel: intl.formatMessage(sharedMessages.replaceProjectConfirm),
    cancelLabel: intl.formatMessage(sharedMessages.cancel),
  })
