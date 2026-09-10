const log = require('../util/log');
const LinkClient = require('../link/client/link-client');
const CloudClient = require('../link/client/cloud-client');

/**
 * Default serial-monitor baud rate, used until the GUI changes it via {@link VirtualMachine#setMonitorBaud}.
 * @type {number}
 */
const DEFAULT_MONITOR_BAUD = 115200;

/**
 * The device-link subsystem owned by the VM: the helper and cloud link clients, the active client, and
 * the board discovery / connect / compile / upload / monitor operations routed through it. The VM
 * exposes its public surface through delegators and exposes `client`/`linkClient`/`cloudClient`
 * through accessors. The device registry and active peripheral libs are reached through the `vm`
 * back-reference.
 */
module.exports = class LinkController {
    /**
     * @param {VirtualMachine} vm - the owning VM, used to reach the runtime, the device registry, and
     *   the active peripherals' libs.
     */
    constructor (vm) {
        this.vm = vm;

        /**
         * Device link to the native helper (thingblock-link), over a WebSocket. Constructing it is
         * free — the socket opens lazily on first use.
         *
         * `__THINGBLOCK_RESOURCE_BASE__` is the seam for a host that serves the resource packs itself
         * (the desktop shell, which bundles them alongside the editor); unset everywhere else, leaving
         * the helper's own `/resources` route in play.
         * @type {LinkClient}
         */
        this.linkClient = new LinkClient(this.vm.runtime, {
            resourceBase: globalThis.__THINGBLOCK_RESOURCE_BASE__ || null
        });

        /**
         * Device link for the server-build (full-web) mode, over Web Serial. The web-mode peer to
         * `linkClient`; its port opens lazily on first use.
         * @type {CloudClient}
         */
        this.cloudClient = new CloudClient(this.vm.runtime);

        /**
         * The active device-link {@link Client} that board discovery, connection, and (later)
         * compile/upload/monitor route through. `setLinkMode` swaps it between `linkClient` and
         * `cloudClient`; both instances persist so a mode switch keeps each transport's state.
         * @type {Client}
         */
        this.client = this.linkClient;

        /**
         * Baud rate the serial monitor is (re)opened at. The active client auto-opens a monitor on
         * connect and reopens around upload, so it needs a remembered rate; the GUI changes it via
         * {@link setMonitorBaud}.
         * @type {number}
         */
        this._monitorBaud = DEFAULT_MONITOR_BAUD;
    }

    /**
     * Select the device-link backend board operations route through: `'cloud'` for the web/Web Serial
     * client, anything else for the native helper. Disconnects the current client first so switching
     * never leaves a dangling link.
     * @param {string} mode - the link mode, `'link'` or `'cloud'`.
     * @returns {void}
     */
    setLinkMode (mode) {
        const next = mode === 'cloud' ? this.cloudClient : this.linkClient;
        if (next === this.client) return;
        if (this.client.isConnected) {
            this.client.disconnect();
        }
        this.client = next;
    }

    /**
     * Discover the boards connected to the user's machine that match the selected device, via the
     * active link client. Discovery filters connected ports by the device's `getUploadConfig().pnpid`.
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @returns {Promise<Array.<object>>} the available targets, each `{id, name}`.
     */
    listBoards (deviceId) {
        const device = this.vm.deviceRegistry.get(deviceId);
        if (!device) {
            return Promise.reject(new Error(`listBoards: no device registered for "${deviceId}"`));
        }
        return this.client.listBoards(device);
    }

    /**
     * Open the link to a discovered board via the active link client. Emits `DEVICE_CONNECTED` on
     * success.
     * @param {object} target - the target to open (from `listBoards()`), `{id, name}`.
     * @returns {Promise<void>} resolves once connected.
     */
    connectBoard (target) {
        return this.client.connect(target).then(() => {
            // Auto-open the serial monitor so the board's output streams as soon as it is connected.
            // Best-effort: a monitor that fails to open must not fail the connection itself.
            this.client.openMonitor({baudRate: this._monitorBaud})
                .catch(err => log.warn(`connectBoard: serial monitor did not open: ${err.message}`));
        });
    }

    /**
     * Compile generated firmware source for the selected device via the active link client, streaming
     * build log and progress to the optional callbacks. The active peripherals' vendored libs are
     * passed as references the helper resolves from its resource root (no lib bytes cross the link).
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @param {string} source - the generated Arduino C++ source.
     * @param {import('../link/client/callbacks').StreamCallbacks} [callbacks] - optional
     *   `{onLog, onProgress}` streaming callbacks.
     * @returns {Promise<object>} the compiled artifact `{format, path}`.
     */
    compile (deviceId, source, callbacks) {
        const device = this.vm.deviceRegistry.get(deviceId);
        if (!device) {
            return Promise.reject(new Error(`compile: no device registered for "${deviceId}"`));
        }
        return this.client.compile(device, source, this.vm.getActivePeripheralLibs(), callbacks);
    }

    /**
     * Flash a compiled artifact to the connected board for the selected device via the active link
     * client, streaming the upload tool's output to the optional callbacks. Requires a connected board.
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @param {object} artifact - the artifact from `compile()` (`{format, path}`).
     * @param {import('../link/client/callbacks').StreamCallbacks} [callbacks] - optional
     *   `{onLog, onProgress}` streaming callbacks.
     * @returns {Promise<void>} resolves once the flash completes.
     */
    upload (deviceId, artifact, callbacks) {
        const device = this.vm.deviceRegistry.get(deviceId);
        if (!device) {
            return Promise.reject(new Error(`upload: no device registered for "${deviceId}"`));
        }
        return this._flashWithMonitorFreed(() => this.client.flash(device, artifact, callbacks));
    }

    /**
     * Flash a pack-shipped firmware image to the connected board for the selected device via the active
     * link client, streaming the upload tool's output to the optional callbacks. The counterpart to
     * `upload()` for restoring a device's live-mode firmware rather than uploading a freshly compiled
     * artifact; it needs the same monitor handling `upload()` has, since it drives the same upload tool
     * over the board's one serial port. Requires a connected board.
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @param {string} pack - pack directory relative to the resource root (from `DeviceManager`).
     * @param {string} file - firmware image path within the pack.
     * @param {import('../link/client/callbacks').StreamCallbacks} [callbacks] - optional
     *   `{onLog, onProgress}` streaming callbacks.
     * @returns {Promise<void>} resolves once the flash completes.
     */
    flashFirmware (deviceId, pack, file, callbacks) {
        const device = this.vm.deviceRegistry.get(deviceId);
        if (!device) {
            return Promise.reject(new Error(`flashFirmware: no device registered for "${deviceId}"`));
        }
        return this._flashWithMonitorFreed(() => this.client.flashFirmware(device, pack, file, callbacks));
    }

    /**
     * Free the serial monitor for a flash and restore it after, regardless of whether the flash
     * resolves or rejects. Shared by `upload()` and `flashFirmware()`: the board's one serial port
     * can't be monitored while the upload tool drives it, so the monitor must be closed for the flash
     * and reopened after. `closeMonitor` is a no-op when none is open. A reopen failure is swallowed to
     * a warning rather than a rejection — the flash has already settled on its own terms by then.
     * @param {function(): Promise<void>} runFlash - performs the flash; its outcome passes through.
     * @returns {Promise<void>} resolves/rejects with `runFlash`'s outcome.
     * @private
     */
    async _flashWithMonitorFreed (runFlash) {
        await this.client.closeMonitor();
        try {
            await runFlash();
        } finally {
            if (this.client.isConnected) {
                this.client.openMonitor({baudRate: this._monitorBaud})
                    .catch(err => log.warn(`_flashWithMonitorFreed: serial monitor did not reopen: ${err.message}`));
            }
        }
    }

    /**
     * Abort the in-flight compile or upload on the active link client, if any. The running
     * `compile`/`upload` promise rejects with a cancellation error. A no-op when nothing is running.
     * @returns {void}
     */
    cancelUpload () {
        this.client.cancel();
    }

    /**
     * The install status of the selected device's boards platform (core) via the active link client,
     * or null when that client has no platform manager (the cloud/Web Serial backend).
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @returns {Promise<?import('../link/client/client').PlatformStatus>} the status, or null.
     */
    getPlatformStatus (deviceId) {
        const device = this.vm.deviceRegistry.get(deviceId);
        if (!device) {
            return Promise.reject(new Error(`getPlatformStatus: no device registered for "${deviceId}"`));
        }
        return this.client.getPlatformStatus(device);
    }

    /**
     * Download and install the selected device's boards platform via the active link client, streaming
     * download/install progress to the optional callbacks.
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @param {import('../link/client/callbacks').StreamCallbacks} [callbacks] - optional
     *   `{onLog, onProgress}` streaming callbacks.
     * @returns {Promise<void>} resolves once the platform is installed and compilable.
     */
    installPlatform (deviceId, callbacks) {
        const device = this.vm.deviceRegistry.get(deviceId);
        if (!device) {
            return Promise.reject(new Error(`installPlatform: no device registered for "${deviceId}"`));
        }
        return this.client.installPlatform(device, callbacks);
    }

    /**
     * Abort the in-flight platform install on the active link client, if any. The running
     * `installPlatform` promise rejects with a cancellation error. A no-op when nothing is running.
     * @returns {void}
     */
    cancelPlatformInstall () {
        this.client.cancel();
    }

    /**
     * Open the serial monitor on the connected board via the active link client. Inbound serial bytes
     * are emitted on the runtime as `SERIAL_DATA`. Requires a connected board.
     * @param {{baudRate: number}} options - the monitor baud rate.
     * @returns {Promise<void>} resolves once the monitor is open.
     */
    openMonitor (options) {
        return this.client.openMonitor(options);
    }

    /**
     * Write bytes to the open serial monitor via the active link client. A no-op when no monitor is
     * open.
     * @param {string} data - the bytes to send.
     * @returns {void}
     */
    writeMonitor (data) {
        this.client.writeMonitor(data);
    }

    /**
     * Close the serial monitor via the active link client, leaving the board connected.
     * @returns {Promise<void>} resolves once the monitor is closed.
     */
    closeMonitor () {
        return this.client.closeMonitor();
    }

    /**
     * Set the baud rate the serial monitor (re)opens at. When a board is connected the open monitor is
     * reopened at the new rate; otherwise the rate is just remembered for the next auto-open. The rate
     * is also reused when the monitor reopens after an upload.
     * @param {number} rate - the baud rate.
     * @returns {void}
     */
    setMonitorBaud (rate) {
        this._monitorBaud = rate;
        if (this.client.isConnected) {
            this.client.closeMonitor()
                .then(() => this.client.openMonitor({baudRate: rate}))
                .catch(err => log.warn(`setMonitorBaud: serial monitor did not reopen: ${err.message}`));
        }
    }

    /**
     * Close the link to the connected board. Emits `DEVICE_DISCONNECTED`. Safe when not connected.
     * @returns {Promise<void>} resolves once disconnected.
     */
    disconnectBoard () {
        return this.client.disconnect();
    }
};
