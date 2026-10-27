const {BleBackend, BleConnection, BleCharacteristic} = require('./backend');

class WebBluetoothCharacteristic extends BleCharacteristic {
    constructor (gattCharacteristic) {
        super();
        this._char = gattCharacteristic;
        this._handlers = [];
        this._notifying = false;
        this._onValueChanged = this._onValueChanged.bind(this);
    }

    write (bytes) {
        return this._char.writeValueWithoutResponse(bytes);
    }

    async read () {
        const dv = await this._char.readValue();
        return new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
    }

    async subscribe (handler) {
        this._handlers.push(handler);
        if (!this._notifying) {
            await this._char.startNotifications();
            this._char.addEventListener('characteristicvaluechanged', this._onValueChanged);
            this._notifying = true;
        }
        return () => {
            this._handlers = this._handlers.filter(h => h !== handler);
        };
    }

    _onValueChanged (event) {
        const dv = event.target.value;
        const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
        this._handlers.forEach(h => h(bytes));
    }
}

class WebBluetoothConnection extends BleConnection {
    constructor (device, server, onDisconnect) {
        super();
        this._device = device;
        this._server = server;
        this._onDisconnect = onDisconnect;
        this._onGattDisconnect = this._onGattDisconnect.bind(this);
        device.addEventListener('gattserverdisconnected', this._onGattDisconnect);
    }

    async getCharacteristic (serviceUuid, characteristicUuid) {
        const service = await this._server.getPrimaryService(serviceUuid);
        const characteristic = await service.getCharacteristic(characteristicUuid);
        return new WebBluetoothCharacteristic(characteristic);
    }

    disconnect () {
        if (this._server.connected) {
            this._server.disconnect();
        }
    }

    isConnected () {
        return this._server.connected;
    }

    _onGattDisconnect () {
        if (this._onDisconnect) this._onDisconnect();
    }
}

/**
 * BLE backend using the browser's Web Bluetooth API. Only available in
 * Chromium-family browsers with navigator.bluetooth exposed.
 */
class WebBluetoothBackend extends BleBackend {
    static isSupported () {
        return typeof navigator !== 'undefined' && !!navigator.bluetooth;
    }

    scan ({services, namePrefix} = {}, {onDevice, onError}) {
        const filter = {};
        if (services) filter.services = services;
        if (namePrefix) filter.namePrefix = namePrefix;
        // The OS chooser resolves to exactly one device (or rejects). A user
        // dismissing the chooser is NotFoundError — not a failure to surface.
        navigator.bluetooth.requestDevice({filters: [filter]})
            .then(device => onDevice(device))
            .catch(err => {
                if (err.name !== 'NotFoundError' && onError) onError(err);
            });
        // Nothing to stop: requestDevice is a one-shot native chooser.
        return () => {};
    }

    async connect (device, onDisconnect) {
        const server = await device.gatt.connect();
        return new WebBluetoothConnection(device, server, onDisconnect);
    }
}

module.exports = WebBluetoothBackend;
