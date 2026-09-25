import type Device from './device';

/**
 * Holds the set of available devices, keyed by `deviceId`.
 *
 * Devices are constructed with the runtime by whoever owns wiring, then registered here.
 * Lookups by `deviceId` drive device selection and (later) the upload flow.
 */
class DeviceRegistry {
    _byDeviceId: Map<string, Device>;

    constructor () {
        this._byDeviceId = new Map();
    }

    register (device: Device): Device {
        if (this._byDeviceId.has(device.deviceId)) {
            throw new Error(`DeviceRegistry: duplicate deviceId "${device.deviceId}"`);
        }
        this._byDeviceId.set(device.deviceId, device);
        return device;
    }

    get (deviceId: string): Device | null {
        return this._byDeviceId.get(deviceId) || null;
    }

    get deviceIds (): string[] {
        return [...this._byDeviceId.keys()];
    }
}

export default DeviceRegistry;
