import type Runtime from '../engine/runtime';
import type {ConnectionTypeId} from './connection-type';

/** Presentation metadata for the device-selection card. */
export interface DeviceInfo {
    name: string
    description: string
    manufacturer: string
    requires: ConnectionTypeId
    learnMore?: string
    help?: string
}

/**
 * The board option selections (arduino-cli FQBN menu options, e.g. CPU variant or partition scheme) that
 * choose the firmware variant.
 */
export interface CompileConfig {
    options: Record<string, string>
}

/** Everything but the FQBN needed to find and flash the device. */
export interface UploadConfig {
    pnpid: string[]
    uploadSpeed?: number
}

/**
 * Abstract base for a device: the contract for compiling firmware for and flashing one device target.
 *
 * Block palette and code generation are NOT part of this contract — they live in the device's
 * extension/codegen and are linked by `deviceId`.
 */
abstract class Device {
    runtime: Runtime;

    constructor (runtime: Runtime) {
        this.runtime = runtime;
    }

    /**
     * Unique identity of this device. Primary key for the device registry and the link to the
     * block extension / codegen that provides its palette. Two devices may share an `fqbn`, but
     * never a `deviceId`.
     */
    abstract get deviceId (): string;

    abstract getDeviceInfo (): DeviceInfo;

    /**
     * arduino-cli compile/upload target (FQBN), e.g. 'arduino:avr:uno'. The board identity is the
     * same on every OS. Per-OS upload tuning (upload speed, CDC flags) belongs in
     * `getUploadConfig()`, not here; the uploader appends those options to the FQBN at flash time.
     */
    abstract get fqbn (): string;

    /**
     * Merged with `fqbn` when building (and reused when flashing). Returns an empty `options` map when
     * the device's defaults are correct.
     */
    abstract getCompileConfig (): CompileConfig;

    abstract getUploadConfig (): UploadConfig;
}

export default Device;
