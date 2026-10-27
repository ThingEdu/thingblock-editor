import type Device from '../devices/device';
import type {LibRef} from '../devices/peripheral-registry';

/**
 * The slice of a device the link clients read: its FQBN, board-menu options, and discovery/upload
 * settings. Narrower than `Device` so a client never depends on presentation or codegen concerns.
 */
export type LinkDevice = Pick<Device, 'fqbn' | 'getCompileConfig' | 'getUploadConfig' | 'getDeviceInfo'>;

/**
 * One discoverable device the client could open. The VM-facing target shape; a backend maps its
 * transport's own shape (e.g. the helper's `{port, label}`) onto this.
 */
export interface ConnectionTarget {
    /** Stable identifier for this target (e.g. serial path or helper port id). */
    id: string
    /** Human-readable label for the connect UI. */
    name: string
}

/**
 * Install status of a boards platform (a core such as `esp32:esp32`), as reported by
 * `getPlatformStatus()`. `known` is false when the backend's package indexes don't list the platform
 * at all (as opposed to listing it uninstalled).
 */
export interface PlatformStatus {
    /** The platform id, `vendor:architecture` (e.g. `esp32:esp32`). */
    id: string
    name: string
    installed: boolean
    known: boolean
    installedVersion?: string
    latestVersion?: string
}

/**
 * A compiled firmware binary handed from `compile()` to `flash()`. The payload is backend-specific:
 * the helper keeps the binary on disk and carries its `path` (no bytes over the WS), while the web
 * backend carries the images in `parts` as base64.
 */
export interface Artifact {
    /** Binary format: 'bin' (ESP) or 'hex' (AVR). */
    format: string
    path?: string
    /** Flash images in write order; absent for a single-image (AVR) build. */
    parts?: Array<{data: string, offset: number}>
}

/** One progress update from a long-running operation. */
export interface Progress {
    phase: string
    percent: number
}

/**
 * The streaming-callback interface for a long-running operation (`compile`, `flash`, platform install).
 * A caller passes the hooks it cares about; the client fills any it omits with a no-op via
 * `withDefaults`, so a handler can invoke every callback unconditionally.
 */
export interface StreamCallbacks {
    /** Receives each stdout/stderr chunk from the operation. */
    onLog?: (chunk: string) => void
    onProgress?: (progress: Progress) => void
}

/** Discovering, opening and closing the link to one physical device. */
export interface Connection {
    /**
     * Discover the targets this client could open, narrowed to the selected device. A backend that
     * cannot enumerate (Web Serial) returns a single stand-in target whose selection opens the native
     * picker in `connect()`; an empty array means no matching board was found.
     */
    listBoards (device: LinkDevice): Promise<ConnectionTarget[]>

    /**
     * Open the link to a target. Optional: helper mode passes a target chosen from `listBoards()`; web
     * mode lets the browser's native picker choose.
     */
    connect (target?: ConnectionTarget | null): Promise<void>

    /** Close the link and release the transport. Safe to call when already disconnected. */
    disconnect (): Promise<void>

    /** Whether the link is currently open. Flashing and monitoring require it. */
    readonly isConnected: boolean

    /**
     * The open transport handle that the flasher writes firmware to and the serial monitor reads from.
     * The concrete type is backend-specific, so consumers receive it opaquely.
     */
    readonly transport: unknown
}

/** Turning generated source into a firmware artifact, and the toolchain that does it. */
export interface Builder {
    /** Build firmware for the device from generated source, streaming progress and build log. */
    compile (
        device: LinkDevice,
        source: string,
        libs?: LibRef[],
        callbacks?: StreamCallbacks
    ): Promise<Artifact>

    /** Abort the in-flight compile or platform install, if any. A no-op when nothing is running. */
    cancel (): void

    /**
     * The install status of the device's boards platform, or null when this backend has no platform
     * manager, in which case the GUI skips its install flow.
     */
    getPlatformStatus (device: LinkDevice): Promise<PlatformStatus | null>

    /** Download and install the device's boards platform; rejects on a backend with no platform manager. */
    installPlatform (device: LinkDevice, callbacks?: StreamCallbacks): Promise<void>
}

/** Writing firmware to the connected device. */
export interface Flasher {
    /** Flash a compiled artifact to the connected device, streaming the upload tool's output. */
    flash (device: LinkDevice, artifact: Artifact, callbacks?: StreamCallbacks): Promise<void>

    /**
     * Flash a prebuilt firmware image the device's pack ships, in place of a compiled artifact. A
     * backend that reports `canFlashFirmware` false still rejects with a mode-specific reason, since
     * the flag is advisory for the GUI rather than a precondition callers must check.
     */
    flashFirmware (device: LinkDevice, pack: string, file: string, callbacks?: StreamCallbacks): Promise<void>

    /** Whether `flashFirmware()` can succeed; the GUI checks it before offering a firmware install. */
    readonly canFlashFirmware: boolean

    /** Abort the in-flight flash, if any. A no-op when nothing is running or the backend cannot abort. */
    cancel (): void
}

/** Reading from and writing to the device's serial port. */
export interface SerialMonitor {
    /** Open the monitor on the connected transport; inbound bytes are emitted as `SERIAL_DATA`. */
    openMonitor (options: {baudRate: number}): Promise<void>

    /** Write bytes to the open monitor. A no-op when none is open. */
    writeMonitor (data: string): void

    /** Close the monitor, leaving the link connected. */
    closeMonitor (): Promise<void>
}

/**
 * One transport's capabilities, each its own object built around the transport state they share. A
 * backend factory returns these, and the VM's link controller routes board operations to the
 * active backend's parts.
 */
export interface Backend {
    connection: Connection
    builder: Builder
    flasher: Flasher
    monitor: SerialMonitor
    /** The backend's resource-pack base URL, or null when it serves none. */
    resourceOrigin: string | null
}
