const log = require('../../util/log');

/**
 * The VM's device-link surface: board discovery, connect, compile, upload, platform install and the
 * serial monitor, driven through the active backend's capability objects (see {@link LinkController}).
 * Devices are resolved from the registry by id, and the monitor is kept in step with the connection
 * and with flashing here, because the board's one serial port can't be monitored while it is flashed.
 */
module.exports = class LinkMixin {
    /**
     * Select the device-link backend board operations route through.
     * @param {string} mode - the link mode, `'link'` for the native helper or `'cloud'` for Web Serial.
     */
    setLinkMode (mode) {
        this._link.setLinkMode(mode);
    }

    /**
     * Run a link operation for a registered device, resolved from the registry by id.
     * @param {string} operation - the calling operation, named in the rejection.
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @param {function(Device): Promise} run - performs the operation for the resolved device.
     * @returns {Promise} the operation's result, or a rejection when no such device is registered.
     * @private
     */
    _withLinkDevice (operation, deviceId, run) {
        const device = this.deviceRegistry.get(deviceId);
        if (!device) {
            return Promise.reject(new Error(`${operation}: no device registered for "${deviceId}"`));
        }
        return run(device);
    }

    /**
     * Discover the boards connected to the user's machine that match the selected device. Discovery
     * filters connected ports by the device's `getUploadConfig().pnpid`.
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @returns {Promise<Array.<object>>} the available targets, each `{id, name}`.
     */
    listBoards (deviceId) {
        return this._withLinkDevice('listBoards', deviceId,
            device => this._link.getBackend().connection.listBoards(device));
    }

    /**
     * Open the link to a discovered board. Emits `DEVICE_CONNECTED` on success.
     * @param {object} target - the target to open (from `listBoards()`), `{id, name}`.
     * @returns {Promise<void>} resolves once connected.
     */
    async connectBoard (target) {
        const {connection, monitor} = this._link.getBackend();
        await connection.connect(target);
        // Auto-open the serial monitor so the board's output streams as soon as it is connected.
        // Best-effort: a monitor that fails to open must not fail the connection itself.
        monitor.openMonitor({baudRate: this._link.monitorBaud})
            .catch(err => log.warn(`connectBoard: serial monitor did not open: ${err.message}`));
    }

    /**
     * Close the link to the connected board. Emits `DEVICE_DISCONNECTED`. Safe when not connected.
     * @returns {Promise<void>} resolves once disconnected.
     */
    disconnectBoard () {
        return this._link.getBackend().connection.disconnect();
    }

    /**
     * Compile generated firmware source for the selected device, streaming build log and progress to
     * the optional callbacks. The active peripherals' vendored libs are passed as references the
     * backend resolves from its resource root (no lib bytes cross the link).
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @param {string} source - the generated Arduino C++ source.
     * @param {StreamCallbacks} [callbacks] - optional `{onLog, onProgress}` streaming callbacks.
     * @returns {Promise<object>} the compiled artifact.
     */
    compile (deviceId, source, callbacks) {
        return this._withLinkDevice('compile', deviceId, device => this._link.getBackend().builder
            .compile(device, source, this.getActivePeripheralLibs(), callbacks));
    }

    /**
     * Flash a compiled artifact to the connected board for the selected device, streaming the upload
     * tool's output to the optional callbacks. Requires a connected board.
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @param {object} artifact - the artifact from `compile()`.
     * @param {StreamCallbacks} [callbacks] - optional `{onLog, onProgress}` streaming callbacks.
     * @returns {Promise<void>} resolves once the flash completes.
     */
    upload (deviceId, artifact, callbacks) {
        return this._withLinkDevice('upload', deviceId, device =>
            this._flashWithMonitorFreed(flasher => flasher.flash(device, artifact, callbacks)));
    }

    /**
     * Flash a pack-shipped firmware image to the connected board for the selected device. The
     * counterpart to `upload()` for restoring a device's live-mode firmware rather than uploading a
     * freshly compiled artifact; it needs the same monitor handling `upload()` has, since it drives the
     * same upload tool over the board's one serial port. Requires a connected board.
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @param {string} pack - pack directory relative to the resource root (from `DeviceManager`).
     * @param {string} file - firmware image path within the pack.
     * @param {StreamCallbacks} [callbacks] - optional `{onLog, onProgress}` streaming callbacks.
     * @returns {Promise<void>} resolves once the flash completes.
     */
    flashFirmware (deviceId, pack, file, callbacks) {
        return this._withLinkDevice('flashFirmware', deviceId, device =>
            this._flashWithMonitorFreed(flasher => flasher.flashFirmware(device, pack, file, callbacks)));
    }

    /**
     * Free the serial monitor for a flash and restore it after, regardless of whether the flash
     * resolves or rejects. The board's one serial port can't be monitored while the upload tool drives
     * it, so the monitor is closed for the flash and reopened after. `closeMonitor` is a no-op when
     * none is open. A reopen failure is swallowed to a warning rather than a rejection — the flash has
     * already settled on its own terms by then.
     * @param {function(Flasher): Promise<void>} runFlash - performs the flash; its outcome passes through.
     * @returns {Promise<void>} resolves/rejects with `runFlash`'s outcome.
     * @private
     */
    async _flashWithMonitorFreed (runFlash) {
        const {connection, flasher, monitor} = this._link.getBackend();
        await monitor.closeMonitor();
        try {
            await runFlash(flasher);
        } finally {
            if (connection.isConnected) {
                monitor.openMonitor({baudRate: this._link.monitorBaud})
                    .catch(err => log.warn(`_flashWithMonitorFreed: serial monitor did not reopen: ${err.message}`));
            }
        }
    }

    /**
     * Abort the in-flight compile or upload, if any. The running promise rejects with a cancellation
     * error. A no-op when nothing is running.
     */
    cancelUpload () {
        this._cancelInFlight();
    }

    /**
     * Abort the in-flight platform install, if any. The running `installPlatform` promise rejects with
     * a cancellation error. A no-op when nothing is running.
     */
    cancelPlatformInstall () {
        this._cancelInFlight();
    }

    /**
     * Abort whichever long-running operation is in flight. The builder and the flasher each own one
     * kind of operation, and a backend has only one running at a time, so cancelling through both
     * reaches it; the one with nothing running is a no-op.
     * @private
     */
    _cancelInFlight () {
        const {builder, flasher} = this._link.getBackend();
        builder.cancel();
        flasher.cancel();
    }

    /**
     * The install status of the selected device's boards platform (core), or null when the active
     * backend has no platform manager (the cloud/Web Serial backend).
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @returns {Promise<?PlatformStatus>} the status, or null.
     */
    getPlatformStatus (deviceId) {
        return this._withLinkDevice('getPlatformStatus', deviceId,
            device => this._link.getBackend().builder.getPlatformStatus(device));
    }

    /**
     * Download and install the selected device's boards platform, streaming download/install progress
     * to the optional callbacks.
     * @param {string} deviceId - the selected device's id (from `getDeviceList()`).
     * @param {StreamCallbacks} [callbacks] - optional `{onLog, onProgress}` streaming callbacks.
     * @returns {Promise<void>} resolves once the platform is installed and compilable.
     */
    installPlatform (deviceId, callbacks) {
        return this._withLinkDevice('installPlatform', deviceId,
            device => this._link.getBackend().builder.installPlatform(device, callbacks));
    }

    /**
     * Open the serial monitor on the connected board. Inbound serial bytes are emitted on the runtime
     * as `SERIAL_DATA`. Requires a connected board.
     * @param {{baudRate: number}} options - the monitor baud rate.
     * @returns {Promise<void>} resolves once the monitor is open.
     */
    openMonitor (options) {
        return this._link.getBackend().monitor.openMonitor(options);
    }

    /**
     * Write bytes to the open serial monitor. A no-op when no monitor is open.
     * @param {string} data - the bytes to send.
     */
    writeMonitor (data) {
        this._link.getBackend().monitor.writeMonitor(data);
    }

    /**
     * Close the serial monitor, leaving the board connected.
     * @returns {Promise<void>} resolves once the monitor is closed.
     */
    closeMonitor () {
        return this._link.getBackend().monitor.closeMonitor();
    }

    /**
     * Set the baud rate the serial monitor (re)opens at. When a board is connected the open monitor is
     * reopened at the new rate; otherwise the rate is just remembered for the next auto-open. The rate
     * is also reused when the monitor reopens after an upload.
     * @param {number} rate - the baud rate.
     */
    setMonitorBaud (rate) {
        this._link.monitorBaud = rate;
        const {connection, monitor} = this._link.getBackend();
        if (connection.isConnected) {
            monitor.closeMonitor()
                .then(() => monitor.openMonitor({baudRate: rate}))
                .catch(err => log.warn(`setMonitorBaud: serial monitor did not reopen: ${err.message}`));
        }
    }
};
