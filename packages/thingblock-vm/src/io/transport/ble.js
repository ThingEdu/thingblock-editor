const WebBluetoothBackend = require('./ble/web-bluetooth');
const HelperBleBackend = require('./ble/helper');

/**
 * Picks the BLE backend for the current environment. Feature-detect the API
 * itself, never the user-agent: Tauri's WebView2 (Windows) is Chromium but
 * still doesn't expose Web Bluetooth, so it must fall through to the helper
 * the same as WebKitGTK (Linux) / WKWebView (macOS).
 * @returns {Function} A BleBackend subclass constructor.
 */
const detectBleBackend = function () {
    if (WebBluetoothBackend.isSupported()) {
        return WebBluetoothBackend;
    }
    return HelperBleBackend;
};

/**
 * Generic BLE transport: scan/connect/GATT access with the environment's
 * backend selected transparently. Extensions supply their own service and
 * characteristic UUIDs and implement their own framing/handshake on top —
 * this layer moves raw bytes only.
 */
class BleTransport {
    constructor (BackendClass = detectBleBackend()) {
        this._backend = new BackendClass();
    }

    /**
     * Start a streaming scan. See {@link import('./ble/backend').BleBackend#scan}.
     * @param {object} filter
     * @param {Array<string>} filter.services Service UUIDs to filter by.
     * @param {string} [filter.namePrefix] Optional device name prefix filter.
     * @param {object} callbacks
     * @param {function(object): void} callbacks.onDevice Called per discovered device.
     * @param {function(Error): void} [callbacks.onError] Called on a scan failure.
     * @returns {function(): void} A function that stops the scan.
     */
    scan (filter, callbacks) {
        return this._backend.scan(filter, callbacks);
    }

    /**
     * @param {*} device Device handle returned by scan().
     * @param {Function} [onDisconnect] Called if the peripheral disconnects unexpectedly.
     * @returns {Promise<import('./ble/backend').BleConnection>}
     */
    connect (device, onDisconnect) {
        return this._backend.connect(device, onDisconnect);
    }
}

BleTransport.detectBleBackend = detectBleBackend;

module.exports = BleTransport;
