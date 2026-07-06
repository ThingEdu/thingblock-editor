/**
 * Abstract BLE backend, picked by ../ble.js based on the environment.
 * Exposes generic GATT primitives only — extensions layer their own protocol
 * (service/characteristic UUIDs, framing, handshake) on top.
 */
class BleBackend {
    static isSupported () {
        throw new Error('isSupported() not implemented');
    }

    /**
     * Start scanning. Discovery is streaming: `onDevice` fires once per hit —
     * Web Bluetooth reports the single device the OS chooser returns, while the
     * helper reports every advertising peripheral until stopped. Each device is
     * an opaque handle with at least `{id, name}`, passed back to connect().
     * @param {object} filter
     * @param {Array<string>} filter.services Service UUIDs to filter by.
     * @param {string} [filter.namePrefix] Optional device name prefix filter.
     * @param {object} callbacks
     * @param {function(object): void} callbacks.onDevice Called per discovered device.
     * @param {function(Error): void} [callbacks.onError] Called on a scan failure.
     * @returns {function(): void} A function that stops the scan.
     */
    scan (filter, callbacks) { // eslint-disable-line no-unused-vars
        throw new Error('scan() not implemented');
    }

    /**
     * @param {*} device Device handle returned by scan().
     * @param {Function} [onDisconnect] Called if the peripheral disconnects unexpectedly.
     * @returns {Promise<BleConnection>}
     */
    connect (device, onDisconnect) { // eslint-disable-line no-unused-vars
        throw new Error('connect() not implemented');
    }
}

/**
 * Abstract BLE GATT connection to a single peripheral.
 */
class BleConnection {
    /**
     * @param {string} serviceUuid
     * @param {string} characteristicUuid
     * @returns {Promise<BleCharacteristic>}
     */
    getCharacteristic (serviceUuid, characteristicUuid) { // eslint-disable-line no-unused-vars
        throw new Error('getCharacteristic() not implemented');
    }

    disconnect () {
        throw new Error('disconnect() not implemented');
    }

    isConnected () {
        throw new Error('isConnected() not implemented');
    }
}

/**
 * Abstract BLE GATT characteristic. Reads/writes/notifications carry raw
 * bytes only — no framing or protocol semantics.
 */
class BleCharacteristic {
    /**
     * @param {Uint8Array} bytes
     * @returns {Promise<void>}
     */
    write (bytes) { // eslint-disable-line no-unused-vars
        throw new Error('write() not implemented');
    }

    /**
     * @returns {Promise<Uint8Array>}
     */
    read () {
        throw new Error('read() not implemented');
    }

    /**
     * @param {function(Uint8Array): void} handler
     * @returns {Promise<Function>} Resolves to an unsubscribe function.
     */
    subscribe (handler) { // eslint-disable-line no-unused-vars
        throw new Error('subscribe() not implemented');
    }
}

module.exports = {BleBackend, BleConnection, BleCharacteristic};
