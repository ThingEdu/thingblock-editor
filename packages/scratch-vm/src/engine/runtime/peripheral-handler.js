/**
 * Owns the hardware-peripheral side of the runtime: the registry of extensions that manage a
 * peripheral connection. Extensions bring their own transport; this class only routes scan,
 * connect, disconnect, and connection-state calls to the extension registered for an id.
 */
class PeripheralHandler {
    constructor () {
        /**
         * Extensions that manage a hardware peripheral connection, keyed by extension id.
         * @type {Object.<string, object>}
         */
        this._extensions = {};
    }

    /**
     * Register an extension that communicates with a hardware peripheral by id,
     * to have access to it and its peripheral functions in the future.
     * @param {string} extensionId - the id of the extension.
     * @param {object} extension - the extension to register.
     */
    register (extensionId, extension) {
        this._extensions[extensionId] = extension;
    }

    /**
     * Tell the specified extension to scan for a peripheral.
     * @param {string} extensionId - the id of the extension.
     */
    scan (extensionId) {
        if (this._extensions[extensionId]) {
            this._extensions[extensionId].scan();
        }
    }

    /**
     * Connect to the extension's specified peripheral.
     * @param {string} extensionId - the id of the extension.
     * @param {number} peripheralId - the id of the peripheral.
     */
    connect (extensionId, peripheralId) {
        if (this._extensions[extensionId]) {
            this._extensions[extensionId].connect(peripheralId);
        }
    }

    /**
     * Disconnect from the extension's connected peripheral.
     * @param {string} extensionId - the id of the extension.
     */
    disconnect (extensionId) {
        if (this._extensions[extensionId]) {
            this._extensions[extensionId].disconnect();
        }
    }

    /**
     * Returns whether the extension has a currently connected peripheral.
     * @param {string} extensionId - the id of the extension.
     * @returns {boolean} - whether the extension has a connected peripheral.
     */
    isConnected (extensionId) {
        let isConnected = false;
        if (this._extensions[extensionId]) {
            isConnected = this._extensions[extensionId].isConnected();
        }
        return isConnected;
    }
}

module.exports = PeripheralHandler;
