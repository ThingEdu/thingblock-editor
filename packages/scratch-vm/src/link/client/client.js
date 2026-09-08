/**
 * Abstract base for a device-link backend: the single contract for discovering, opening, building
 * for, flashing, and monitoring one physical device. Two backends implement it — the native helper
 * over a WebSocket ({@link LinkClient}) and the browser's Web Serial API (web mode) — so the firmware
 * pipeline and the GUI can drive either without knowing which transport is behind it.
 *
 * Concrete clients extend this and implement every method below; the base throws to surface a
 * half-implemented backend the moment it is used. A client owns its transport (a helper WS session, a
 * serial port handle); the flasher and the serial monitor borrow it rather than opening their own.
 *
 * Wire formats never escape a client. Each backend maps its transport's shapes onto the VM-facing
 * typedefs defined here ({@link ConnectionTarget}, {@link Artifact}), so callers stay transport-agnostic.
 *
 * Implementations emit `Runtime.DEVICE_CONNECTED` / `Runtime.DEVICE_DISCONNECTED` so the GUI and the
 * serial monitor can track the link.
 */
class Client {
    /**
     * @param {Runtime} runtime - the VM runtime, used to emit connection lifecycle events.
     */
    constructor (runtime) {
        this.runtime = runtime;
    }

    /**
     * Discover the targets this client could open, narrowed to the selected device. Implementations
     * filter by the device's `getUploadConfig().pnpid` so the list shows the chosen board's ports.
     * Each returned target is selectable in the GUI and passed back to `connect()`. A backend that
     * cannot enumerate (Web Serial) returns a single stand-in target whose selection opens the native
     * picker in `connect()`; an empty array means no matching board was found.
     * @param {Device} device - the selected device, used to filter candidates.
     * @returns {Promise<Array.<ConnectionTarget>>} the available targets.
     */
    listBoards (device) {
        throw new Error(`${this.constructor.name} must implement listBoards()`);
    }

    /**
     * Open the link to a target. On success the transport is available via `transport` and
     * `isConnected` is true. Resolves when the link is ready to flash or monitor.
     * @param {?ConnectionTarget} [target] - the target to open. Optional: helper mode passes a target
     *   chosen from `listBoards()`; web mode omits it and lets the browser's native picker choose.
     * @returns {Promise<void>} resolves once connected.
     */
    connect (target) {
        throw new Error(`${this.constructor.name} must implement connect()`);
    }

    /**
     * Close the link and release the transport. Safe to call when already disconnected.
     * @returns {Promise<void>} resolves once closed.
     */
    disconnect () {
        throw new Error(`${this.constructor.name} must implement disconnect()`);
    }

    /**
     * Whether the link is currently open. The firmware pipeline requires this before uploading.
     * @returns {boolean} true when connected.
     */
    get isConnected () {
        throw new Error(`${this.constructor.name} must implement get isConnected()`);
    }

    /**
     * The open transport handle that the flasher writes firmware to and the serial monitor reads from.
     * The concrete type is backend-specific (a helper session, a serial port); consumers receive it
     * opaquely. Throws when not connected.
     * @returns {*} the transport handle.
     */
    get transport () {
        throw new Error(`${this.constructor.name} must implement get transport()`);
    }

    /**
     * The backend's HTTP base URL for served resource packs (device/peripheral manifests, block
     * definitions, vendored libs), or null when this backend serves none. Unlike the operations
     * above this is an optional capability, so the default is null rather than a throw: a backend
     * without resources simply contributes no packs.
     * @returns {?string} the resource base URL (e.g. `http://localhost:3030/resources`), or null.
     */
    get resourceOrigin () {
        return null;
    }

    /**
     * The install status of the device's boards platform (its core, e.g. `esp32:esp32`), or null when
     * this backend has no platform manager. Like `resourceOrigin` this is an optional capability, so
     * the default is null rather than a throw: a backend that always compiles against ready-made
     * toolchains (or not at all) simply reports no status, and the GUI skips its install flow.
     * @param {Device} device - the selected device (supplies the fqbn the platform id derives from).
     * @returns {Promise<?PlatformStatus>} the platform status, or null.
     */
    getPlatformStatus (device) {
        return Promise.resolve(null);
    }

    /**
     * Download and install the device's boards platform via the backend's board manager, streaming
     * progress and log as it goes. Only meaningful for backends that report a status from
     * `getPlatformStatus()`; the default rejects.
     * @param {Device} device - the selected device (supplies the fqbn the platform id derives from).
     * @param {import('./callbacks').StreamCallbacks} [callbacks] - optional `{onLog, onProgress}`
     *   streaming callbacks.
     * @returns {Promise<void>} resolves once the platform is installed and ready to compile against.
     */
    installPlatform (device, callbacks) {
        return Promise.reject(new Error(`${this.constructor.name} does not support installPlatform()`));
    }

    /**
     * Build the arduino-cli FQBN, folding the device's board-menu option selections
     * (`getCompileConfig().options`, e.g. `PartitionScheme`) onto the base fqbn as `:k1=v1,k2=v2`.
     * arduino-cli takes these as part of the FQBN, not as separate compile options. Shared by every
     * backend: they all build through arduino-cli, so a divergence here is a wrong-board build.
     * @param {Device} device - the selected device.
     * @returns {string} the composed FQBN.
     * @protected
     */
    _composeFqbn (device) {
        const {options = {}} = device.getCompileConfig();
        const menu = Object.entries(options)
            .map(([key, value]) => `${key}=${value}`)
            .join(',');
        return menu ? `${device.fqbn}:${menu}` : device.fqbn;
    }

    /**
     * Build firmware for the device from generated source, streaming progress and build log as it goes.
     * @param {Device} device - the selected device (supplies fqbn and compile config).
     * @param {string} source - the generated Arduino C++ source.
     * @param {Array.<{pack: string, lib: string}>} [libs] - vendored-library references the backend
     *   resolves from its resource root (no lib bytes cross the link).
     * @param {import('./callbacks').StreamCallbacks} [callbacks] - optional `{onLog, onProgress}`
     *   streaming callbacks.
     * @returns {Promise<Artifact>} the compiled binary.
     */
    compile (device, source, libs, callbacks) {
        throw new Error(`${this.constructor.name} must implement compile()`);
    }

    /**
     * Flash a compiled artifact to the connected device, streaming the upload tool's output as it goes.
     * @param {Device} device - the selected device (supplies upload config).
     * @param {Artifact} artifact - the binary produced by `compile()`.
     * @param {import('./callbacks').StreamCallbacks} [callbacks] - optional `{onLog, onProgress}`
     *   streaming callbacks.
     * @returns {Promise<void>} resolves once flashed.
     */
    flash (device, artifact, callbacks) {
        throw new Error(`${this.constructor.name} must implement flash()`);
    }

    /**
     * Abort the in-flight long-running operation (compile or flash), if any. Best-effort: the running
     * `compile`/`flash` promise rejects with a cancellation error. A no-op when nothing is running.
     * @returns {void}
     */
    cancel () {
        throw new Error(`${this.constructor.name} must implement cancel()`);
    }

    /**
     * Whether this backend can flash a device pack's prebuilt firmware image via `flashFirmware()`.
     * The GUI checks this before offering the board menu's firmware-restore item, so a backend that
     * cannot flash never tempts a learner into confirming an action that is doomed to reject. False by
     * default; a backend that implements `flashFirmware()` overrides it to true.
     * @returns {boolean} true when `flashFirmware()` can succeed.
     */
    get canFlashFirmware () {
        return false;
    }

    /**
     * Flash a firmware image the device's pack ships, in place of a compiled artifact — the way back
     * to (for ThingBot) live mode after a compiled program has overwritten it. Gated by
     * `canFlashFirmware`: a backend that reports false must still implement this to reject with a
     * clear, mode-specific reason, since `canFlashFirmware` is advisory for the GUI, not a hard
     * precondition callers are guaranteed to check.
     * @param {Device} device - the selected device (supplies fqbn and upload config).
     * @param {string} pack - pack directory under the resource root, e.g. `extensions/devices/thingbot`.
     * @param {string} file - app image within that pack.
     * @param {import('./callbacks').StreamCallbacks} [callbacks] - optional `{onLog, onProgress}`.
     * @returns {Promise<void>} resolves once the flash completes.
     */
    flashFirmware (device, pack, file, callbacks) {
        throw new Error(`${this.constructor.name} must implement flashFirmware()`);
    }

    /**
     * Open the serial monitor on the connected transport. Inbound bytes are delivered to the runtime
     * for `SerialLog`. No monitoring mid-flash — the flasher and monitor share one transport.
     * @param {{baudRate: number}} options - the monitor baud rate.
     * @returns {Promise<void>} resolves once the monitor is open.
     */
    openMonitor (options) {
        throw new Error(`${this.constructor.name} must implement openMonitor()`);
    }

    /**
     * Write bytes to the open serial monitor.
     * @param {string} data - the bytes to send.
     * @returns {void}
     */
    writeMonitor (data) {
        throw new Error(`${this.constructor.name} must implement writeMonitor()`);
    }

    /**
     * Close the serial monitor, leaving the link connected.
     * @returns {Promise<void>} resolves once the monitor is closed.
     */
    closeMonitor () {
        throw new Error(`${this.constructor.name} must implement closeMonitor()`);
    }
}

/**
 * One discoverable device the client could open. The VM-facing target shape; a backend maps its
 * transport's own shape (e.g. the helper's `{port, label}`) onto this.
 * @typedef {object} ConnectionTarget
 * @property {string} id - stable identifier for this target (e.g. serial path or helper port id).
 * @property {string} name - human-readable label for the connect UI.
 */

/**
 * Install status of a boards platform (a core such as `esp32:esp32`), as reported by
 * `getPlatformStatus()`. `known` is false when the backend's package indexes don't list the platform
 * at all (as opposed to listing it uninstalled).
 * @typedef {object} PlatformStatus
 * @property {string} id - the platform id, `vendor:architecture` (e.g. `esp32:esp32`).
 * @property {string} name - human-readable platform name.
 * @property {boolean} installed - whether the platform is installed and compilable.
 * @property {boolean} known - whether the backend's indexes know the platform.
 * @property {string} [installedVersion] - the installed version, when installed.
 * @property {string} [latestVersion] - the latest installable version, when indexed.
 */

/**
 * A compiled firmware binary handed from `compile()` to `flash()`. The payload is backend-specific:
 * the helper keeps the binary on disk and carries its `path` (no bytes over the WS), while the web
 * backend carries the bytes in `data`.
 * @typedef {object} Artifact
 * @property {string} format - binary format, 'bin' (ESP) or 'hex' (AVR).
 * @property {string} [path] - filesystem path to the binary (helper backend).
 * @property {*} [data] - the binary payload (web backend).
 * @property {number} [offset] - flash offset, when the format requires one.
 */

module.exports = Client;
