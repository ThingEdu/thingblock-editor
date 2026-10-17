const {BleBackend, BleConnection, BleCharacteristic} = require('./backend');

/**
 * Default address of the thingblock-link helper's BLE channel. Separate from the
 * flash channel (`ws://localhost:3030/`); the helper bridges GATT over it with
 * btleplug for environments without Web Bluetooth (Tauri's WebKitGTK/WKWebView/
 * WebView2, and non-Chromium browsers).
 * @type {string}
 */
const DEFAULT_URL = 'ws://localhost:3030/io';

/** The WebSocket OPEN readyState (spec-fixed). */
const WS_OPEN = 1;

const bytesToBase64 = bytes => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const base64ToBytes = str => {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

/** Route key for a notification: a peripheral's characteristic. */
const notifyKey = (deviceId, characteristic) => `${deviceId}|${characteristic}`;

class HelperBleCharacteristic extends BleCharacteristic {
    constructor (backend, deviceId, serviceUuid, characteristicUuid) {
        super();
        this._backend = backend;
        this._deviceId = deviceId;
        this._service = serviceUuid;
        this._characteristic = characteristicUuid;
    }

    write (bytes) {
        return this._backend.request('write', {
            deviceId: this._deviceId,
            service: this._service,
            characteristic: this._characteristic,
            data: bytesToBase64(bytes),
            withResponse: false
        });
    }

    async read () {
        const result = await this._backend.request('read', {
            deviceId: this._deviceId,
            service: this._service,
            characteristic: this._characteristic
        });
        return base64ToBytes(result.data);
    }

    async subscribe (handler) {
        const key = notifyKey(this._deviceId, this._characteristic);
        this._backend.addNotifyHandler(key, handler);
        await this._backend.request('subscribe', {
            deviceId: this._deviceId,
            service: this._service,
            characteristic: this._characteristic
        });
        return () => {
            this._backend.removeNotifyHandler(key);
            this._backend.notify('unsubscribe', {
                deviceId: this._deviceId,
                service: this._service,
                characteristic: this._characteristic
            });
        };
    }
}

class HelperBleConnection extends BleConnection {
    constructor (backend, deviceId) {
        super();
        this._backend = backend;
        this._deviceId = deviceId;
        this._connected = true;
    }

    getCharacteristic (serviceUuid, characteristicUuid) {
        // No round-trip: the helper discovered services on connect, so the
        // characteristic is addressed by its UUIDs on each operation.
        return Promise.resolve(
            new HelperBleCharacteristic(this._backend, this._deviceId, serviceUuid, characteristicUuid)
        );
    }

    disconnect () {
        if (!this._connected) return;
        this._connected = false;
        this._backend.forgetDisconnect(this._deviceId);
        this._backend.notify('disconnect', {deviceId: this._deviceId});
    }

    isConnected () {
        return this._connected;
    }
}

/**
 * BLE backend that bridges GATT operations through the thingblock-link helper
 * over a WebSocket. Speaks the helper's `{id, type, payload}` envelope: a
 * request's `id` correlates its terminal `result`/`error`; scans stream
 * `bleDevice` frames on the scan's id; notifications and disconnects arrive as
 * unsolicited `bleNotify`/`bleDisconnected` frames routed by device.
 *
 * The WebSocket and its URL are injectable so tests can drive a fake socket.
 */
class HelperBleBackend extends BleBackend {
    static isSupported () {
        return typeof globalThis.WebSocket !== 'undefined';
    }

    constructor ({url = DEFAULT_URL, WebSocket = globalThis.WebSocket} = {}) {
        super();
        this._url = url;
        this._WebSocket = WebSocket;
        this._ws = null;
        this._openPromise = null;
        this._nextId = 1;
        /** @type {Map<string, {resolve: Function, reject: Function}>} in-flight requests by id. */
        this._pending = new Map();
        /** @type {Map<string, Function>} active scans: scan id → onDevice. */
        this._scans = new Map();
        /** @type {Map<string, Function>} notification routing: deviceId|char → handler. */
        this._notifyHandlers = new Map();
        /** @type {Map<string, Function>} per-connection unexpected-disconnect callbacks. */
        this._disconnectHandlers = new Map();
    }

    scan (filter, {onDevice, onError}) {
        const id = this._nextRequestId();
        this._scans.set(id, onDevice);
        this._sendRequest(id, 'scan', {
            services: filter.services || [],
            namePrefix: filter.namePrefix
        }).then(
            () => this._scans.delete(id),
            err => {
                this._scans.delete(id);
                if (onError) onError(err);
            }
        );
        return () => {
            this._scans.delete(id);
            this.notify('cancel', {}, id);
        };
    }

    async connect (device, onDisconnect) {
        await this.request('connect', {deviceId: device.id});
        if (onDisconnect) this._disconnectHandlers.set(device.id, onDisconnect);
        return new HelperBleConnection(this, device.id);
    }

    /**
     * Send a request under a fresh id and resolve with its terminal `result`
     * payload (or reject on `error`).
     * @param {string} type Request type.
     * @param {object} payload Request payload.
     * @returns {Promise<object>} the `result` payload.
     */
    request (type, payload) {
        return this._sendRequest(this._nextRequestId(), type, payload);
    }

    /**
     * Fire-and-forget send for messages with no reply (`cancel`, `unsubscribe`,
     * `disconnect`). Dropped if the socket isn't open.
     * @param {string} type Message type.
     * @param {object} payload Message payload.
     * @param {string} [id] Correlation id; a fresh one by default (`cancel` reuses the scan's id).
     */
    notify (type, payload, id = this._nextRequestId()) {
        if (this._ws && this._ws.readyState === WS_OPEN) {
            this._ws.send(JSON.stringify({id, type, payload}));
        }
    }

    /** @param {string} key Route key. @param {Function} handler Notification handler. */
    addNotifyHandler (key, handler) {
        this._notifyHandlers.set(key, handler);
    }

    /** @param {string} key Route key. */
    removeNotifyHandler (key) {
        this._notifyHandlers.delete(key);
    }

    /** @param {string} deviceId Device whose disconnect callback to drop (on explicit disconnect). */
    forgetDisconnect (deviceId) {
        this._disconnectHandlers.delete(deviceId);
    }

    _nextRequestId () {
        return String(this._nextId++);
    }

    _sendRequest (id, type, payload) {
        const promise = new Promise((resolve, reject) => {
            this._pending.set(id, {resolve, reject});
        });
        this._ensureOpen()
            .then(() => this._ws.send(JSON.stringify({id, type, payload})))
            .catch(err => this._settle(id, {reject: err}));
        return promise;
    }

    _ensureOpen () {
        if (this._openPromise) return this._openPromise;
        this._openPromise = new Promise((resolve, reject) => {
            const ws = new this._WebSocket(this._url);
            this._ws = ws;
            ws.onopen = () => resolve();
            ws.onmessage = event => this._handleMessage(event.data);
            ws.onerror = () => reject(new Error(`HelperBleBackend: cannot reach ${this._url}`));
            ws.onclose = () => this._handleClose();
        });
        return this._openPromise;
    }

    _handleMessage (raw) {
        let message;
        try {
            message = JSON.parse(raw);
        } catch {
            return;
        }
        const {id, type, payload} = message;
        switch (type) {
        case 'bleDevice': {
            const onDevice = this._scans.get(id);
            if (onDevice) onDevice({id: payload.deviceId, name: payload.name, rssi: payload.rssi});
            break;
        }
        case 'bleNotify': {
            const handler = this._notifyHandlers.get(notifyKey(payload.deviceId, payload.characteristic));
            if (handler) handler(base64ToBytes(payload.data));
            break;
        }
        case 'bleDisconnected': {
            const cb = this._disconnectHandlers.get(payload.deviceId);
            if (cb) {
                this._disconnectHandlers.delete(payload.deviceId);
                cb();
            }
            break;
        }
        case 'result':
            this._settle(id, {resolve: payload});
            break;
        case 'error':
            this._settle(id, {reject: new Error((payload && payload.message) || 'io request failed')});
            break;
        default:
            break;
        }
    }

    _handleClose () {
        const err = new Error('HelperBleBackend: connection to the helper closed');
        for (const id of [...this._pending.keys()]) {
            this._settle(id, {reject: err});
        }
        this._ws = null;
        this._openPromise = null;
        this._scans.clear();
        this._notifyHandlers.clear();
        const handlers = [...this._disconnectHandlers.values()];
        this._disconnectHandlers.clear();
        handlers.forEach(cb => cb());
    }

    _settle (id, outcome) {
        const pending = this._pending.get(id);
        if (!pending) return;
        this._pending.delete(id);
        if ('reject' in outcome) pending.reject(outcome.reject);
        else pending.resolve(outcome.resolve);
    }
}

module.exports = HelperBleBackend;
