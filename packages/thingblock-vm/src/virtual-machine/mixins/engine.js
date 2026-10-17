const formatMessage = require('format-message');

module.exports = class EngineMixin {
    /**
     * Set the audio engine for the VM/runtime
     * @param {!AudioEngine} audioEngine The audio engine to attach
     */
    attachAudioEngine (audioEngine) {
        this.runtime.attachAudioEngine(audioEngine);
    }

    /**
     * Set the storage module for the VM/runtime
     * @param {!ScratchStorage} storage The storage module to attach
     */
    attachStorage (storage) {
        this.runtime.attachStorage(storage);
    }

    /**
     * set the current locale and builtin messages for the VM
     * @param {!string} locale       current locale
     * @param {!object} messages     builtin messages map for current locale
     * @returns {Promise} Promise that resolves when all the blocks have been
     *     updated for a new locale (or empty if locale hasn't changed.)
     */
    setLocale (locale, messages) {
        if (locale !== formatMessage.setup().locale) {
            formatMessage.setup({locale: locale, translations: {[locale]: messages}});
        }
        return this.extensionManager.refreshBlocks();
    }

    /**
     * get the current locale for the VM
     * @returns {string} the current locale in the VM
     */
    getLocale () {
        return formatMessage.setup().locale;
    }

};
