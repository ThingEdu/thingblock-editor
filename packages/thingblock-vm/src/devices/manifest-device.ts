import formatMessage from 'format-message';
import Device, {type CompileConfig, type DeviceInfo, type UploadConfig} from './device';
import type {ConnectionTypeId} from './connection-type';
import type Runtime from '../engine/runtime';

/** The fields of a resource pack's device manifest (its `manifest.js` default export) a device reads. */
export interface DeviceManifest {
    id: string
    /** The device's brand, shown verbatim. */
    name: string
    fqbn: string
    description: formatMessage.MessageObject
    manufacturer: string
    requires: ConnectionTypeId
    learnMore?: string
    help?: string
    compile?: {options?: Record<string, string>}
    upload?: {pnpid?: string[], uploadSpeed?: number}
}

/**
 * A data-driven {@link Device} backed by a helper-served resource-pack device manifest. It bridges the
 * manifest's plain data to the getter/method contract the {@link DeviceRegistry} and `getDeviceList()`
 * expect, so a pack device is selectable exactly like a built-in board.
 *
 * The card's `description` rides in the manifest as a `format-message` descriptor and is resolved here,
 * against the editor's `format-message` singleton (the one `setLocale` configures). A served pack runs
 * in its own module instance and cannot share that translation store, so resolution happens on this
 * consumer side; `name` is the device's brand and stays verbatim.
 */
class ManifestDevice extends Device {
    _manifest: DeviceManifest;

    constructor (runtime: Runtime, manifest: DeviceManifest) {
        super(runtime);
        this._manifest = manifest;
    }

    get deviceId (): string {
        return this._manifest.id;
    }

    get fqbn (): string {
        return this._manifest.fqbn;
    }

    getDeviceInfo (): DeviceInfo {
        const manifest = this._manifest;
        return {
            name: manifest.name,
            description: formatMessage(manifest.description),
            manufacturer: manifest.manufacturer,
            requires: manifest.requires,
            learnMore: manifest.learnMore,
            help: manifest.help
        };
    }

    getCompileConfig (): CompileConfig {
        return {options: this._manifest.compile?.options ?? {}};
    }

    getUploadConfig (): UploadConfig {
        const upload = this._manifest.upload ?? {};
        return {pnpid: upload.pnpid ?? [], uploadSpeed: upload.uploadSpeed};
    }
}

export default ManifestDevice;
