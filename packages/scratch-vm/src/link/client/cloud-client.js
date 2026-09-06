const Client = require('./client');
const {withDefaults} = require('./callbacks');
const log = require('../../util/log');

/**
 * Default address of the cloud build server (thingblock-link-cloud).
 * @type {string}
 */
const DEFAULT_URL = 'http://localhost:8080';

/**
 * Flash rate used when a device declares no `uploadSpeed`. esptool negotiates up to this after
 * connecting at the ROM's own rate.
 * @type {number}
 */
const DEFAULT_FLASH_BAUD = 921600;

/**
 * Baud rate the port is opened at on connect. This is the serial-monitor rate, distinct from the
 * per-device flash `uploadSpeed`; the flasher reopens the port at its own rate when flashing.
 * @type {number}
 */
const DEFAULT_BAUD_RATE = 115200;

/**
 * Id of the single synthetic target {@link CloudClient#listBoards} returns. Web Serial cannot enumerate
 * ports, so the board list shows one entry that stands in for "the browser port picker"; selecting it
 * drives `connect()`, which opens the picker within the click's user gesture.
 * @type {string}
 */
const WEB_SERIAL_TARGET_ID = 'web-serial';

/**
 * A {@link Client} for the server-build (full-web) mode. It connects to and holds the board in the
 * browser via the Web Serial API — the API is a native browser global, not a bundled dependency, so
 * the logic lives in the VM. This is the web-mode peer to {@link LinkClient} (local helper).
 *
 * Wired incrementally, mirroring LinkClient: `listBoards`, `connect`, `disconnect`, `compile` (an
 * NDJSON build stream from thingblock-link-cloud), `flash` (esptool-js) and the serial monitor are
 * live today. Flashing is ESP-only; AVR needs STK500 over Web Serial and throws for now.
 *
 * Discovery is not enumerable in Web Serial without a user gesture, so `listBoards()` returns nothing
 * and `connect()` opens the browser's native port picker instead.
 */
class CloudClient extends Client {
    /**
     * @param {Runtime} runtime - the VM runtime.
     * @param {object} [options] - injection points.
     * @param {string} [options.url] - the build server origin (defaults to `http://localhost:8080`).
     * @param {Function} [options.fetch] - the fetch function (defaults to the global one).
     * @param {object} [options.esptool] - esptool-js `{ESPLoader, Transport}` (defaults to importing it).
     */
    constructor (runtime, {
        url = DEFAULT_URL,
        fetch = globalThis.fetch && globalThis.fetch.bind(globalThis),
        esptool = null
    } = {}) {
        super(runtime);

        /** @type {string} */
        this._url = url.replace(/\/$/, '');
        /** @type {Function} */
        this._fetch = fetch;
        /** @type {?{ESPLoader: Function, Transport: Function}} injected in tests; else imported lazily. */
        this._esptool = esptool;
        /** @type {?SerialPort} the granted, open serial port; null when disconnected. */
        this._port = null;
        this._connected = false;
        /** @type {?AbortController} aborts the in-flight compile; null when none is running. */
        this._abort = null;
        /** @type {number} the rate the port is currently open at. */
        this._baudRate = DEFAULT_BAUD_RATE;
        /**
         * The open monitor's reader and its detached pump, or null when none. Web Serial locks
         * `port.readable` while a reader exists, so the lock must be released before the port closes —
         * hence keeping the pump promise to await.
         * @type {?{reader: ReadableStreamDefaultReader, pump: Promise<void>}}
         */
        this._monitor = null;
    }

    /**
     * The build server's `/resources` static route, which serves the same packs it compiles against.
     * @returns {string} the resource base, e.g. `http://localhost:8080/resources`.
     */
    get resourceOrigin () {
        return `${this._url}/resources`;
    }

    /**
     * @returns {boolean} whether Web Serial is available in this environment (Chromium-based browsers).
     */
    static isSupported () {
        return typeof navigator !== 'undefined' && 'serial' in navigator;
    }

    /**
     * Web Serial filters narrowing the native picker to a device's known USB VID/PIDs. Parses the
     * Windows PNP-ID strings in `getUploadConfig().pnpid` (e.g. 'USB\\VID_2341&PID_0043') into the
     * numeric `{usbVendorId, usbProductId}` form `requestPort` expects.
     * @param {Device} device - the selected device.
     * @returns {Array.<{usbVendorId: number, usbProductId: number}>} the filters (empty if none parse).
     */
    static filtersFromDevice (device) {
        const {pnpid = []} = device.getUploadConfig();
        const filters = [];
        for (const id of pnpid) {
            const match = /VID_([0-9A-Fa-f]{4})&PID_([0-9A-Fa-f]{4})/.exec(id);
            if (match) {
                filters.push({
                    usbVendorId: parseInt(match[1], 16),
                    usbProductId: parseInt(match[2], 16)
                });
            }
        }
        return filters;
    }

    /**
     * Web Serial cannot enumerate ports without a user gesture, so instead of a real list this returns
     * one synthetic target standing in for the browser's port picker, labelled with the selected
     * device. The GUI shows it as a single board tile; selecting it calls `connect()`, which opens the
     * native picker within that click's user gesture. Returns nothing when Web Serial is unavailable.
     * @param {Device} device - the selected device, used to label the entry.
     * @returns {Promise<Array.<ConnectionTarget>>} the single picker entry, or `[]` when unsupported.
     */
    listBoards (device) {
        if (!CloudClient.isSupported()) {
            log.error('CloudClient.listBoards: Web Serial unavailable — navigator.serial is missing. ' +
                'It requires a Chromium-based browser in a secure context (https:// or localhost).');
            return Promise.resolve([]);
        }
        log.info('CloudClient.listBoards: returning the browser-picker entry; ' +
            'selecting it opens the Web Serial port picker via connect()');
        return Promise.resolve([{id: WEB_SERIAL_TARGET_ID, name: device.getDeviceInfo().name}]);
    }

    /**
     * Open the native port picker, then open the chosen port. Requires a user gesture (the picker is
     * gesture-gated by the browser). Emits `DEVICE_CONNECTED` on success.
     * @param {?{filters: Array}} [target] - optional Web Serial filters (see `filtersFromDevice`); when
     *   omitted, the picker shows all serial ports.
     * @returns {Promise<void>} resolves once the port is open.
     */
    async connect (target = null) {
        if (!CloudClient.isSupported()) {
            log.error('CloudClient.connect: Web Serial unavailable — navigator.serial is missing. ' +
                'It requires a Chromium-based browser in a secure context (https:// or localhost).');
            throw new Error('Web Serial is not available in this browser');
        }
        const filters = (target && target.filters) || [];
        log.info(`CloudClient.connect: opening the browser port picker (filters=${JSON.stringify(filters)})`);
        let port;
        try {
            port = await navigator.serial.requestPort({filters});
        } catch (err) {
            // A thrown NotFoundError here usually means the user dismissed the picker without choosing.
            log.warn(`CloudClient.connect: no port selected (${err.name}: ${err.message})`);
            throw err;
        }
        log.info(`CloudClient.connect: port selected, opening at ${DEFAULT_BAUD_RATE} baud`);
        try {
            await port.open({baudRate: DEFAULT_BAUD_RATE});
        } catch (err) {
            // On Linux this is often a permissions problem: add the user to the dialout/uucp group.
            log.error(`CloudClient.connect: failed to open the port (${err.name}: ${err.message})`);
            throw err;
        }
        this._port = port;
        this._baudRate = DEFAULT_BAUD_RATE;
        this._connected = true;
        log.info('CloudClient.connect: connected');
        this.runtime.emit(this.runtime.constructor.DEVICE_CONNECTED);
    }

    /**
     * Close the port and release it. Safe to call when already disconnected. Emits `DEVICE_DISCONNECTED`.
     * @returns {Promise<void>} resolves once closed.
     */
    async disconnect () {
        if (!this._port) {
            log.info('CloudClient.disconnect: no open port; nothing to do');
            return;
        }
        log.info('CloudClient.disconnect: closing the port');
        // The port cannot close while the monitor holds a lock on its readable stream.
        await this.closeMonitor();
        await this._port.close();
        this._port = null;
        this._connected = false;
        this.runtime.emit(this.runtime.constructor.DEVICE_DISCONNECTED);
    }

    /**
     * @returns {boolean} whether a port is currently open.
     */
    get isConnected () {
        return this._connected;
    }

    /**
     * Build firmware on the cloud server, streaming `log`/`progress` to `callbacks` until the terminal
     * frame. The server has no shared filesystem with the browser, so the artifact carries base64
     * `data` rather than a `path`. Vendored libs travel as `{pack, lib}` references the server resolves
     * from its own resource root — the same root it serves at {@link resourceOrigin}.
     * @param {Device} device - the selected device (supplies fqbn and compile config).
     * @param {string} source - the generated Arduino C++ source.
     * @param {Array.<{pack: string, lib: string}>} [libs] - vendored-library references.
     * @param {import('./callbacks').StreamCallbacks} [callbacks] - optional `{onLog, onProgress}`.
     * @returns {Promise<Artifact>} the compiled artifact `{format, data}`.
     */
    async compile (device, source, libs = [], callbacks) {
        const {onLog, onProgress} = withDefaults(callbacks);
        const fqbn = this._composeFqbn(device);
        log.info(`CloudClient.compile: requesting build for ${fqbn} with ${libs.length} vendored lib(s)`);

        this._abort = new AbortController();
        try {
            const response = await this._fetch(`${this._url}/compile`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({fqbn, options: {}, source, libs}),
                signal: this._abort.signal
            });
            // Failures caught before the stream opens (bad lib ref, malformed body) are plain HTTP
            // errors; everything after arrives as a terminal `error` frame instead.
            if (!response.ok) {
                throw new Error(await CloudClient._errorMessage(response));
            }

            let artifact = null;
            for await (const frame of CloudClient._ndjson(response.body)) {
                switch (frame.type) {
                case 'log': onLog(frame.payload.chunk); break;
                case 'progress': onProgress(frame.payload); break;
                case 'result': artifact = frame.payload.artifact; break;
                case 'error': throw new Error(frame.payload.message);
                }
            }
            if (!artifact) {
                throw new Error('CloudClient.compile: stream ended without an artifact');
            }
            log.info(`CloudClient.compile: artifact ready (format=${artifact.format})`);
            return artifact;
        } finally {
            this._abort = null;
        }
    }

    /**
     * Abort the in-flight compile. Dropping the response body is the whole protocol — the server
     * cancels the build when its stream goes away, so there is no cancel message to send.
     * @returns {void}
     */
    cancel () {
        if (!this._abort) return;
        log.info('CloudClient.cancel: aborting the in-flight compile');
        this._abort.abort();
    }

    /**
     * Firmware restore needs a pack-shipped image file arduino-cli reads from a local resource root;
     * cloud mode compiles server-side and flashes over Web Serial with no such local image available.
     * Overridden (rather than inheriting the base's generic "must implement" throw) to name the real,
     * mode-specific reason.
     * @returns {Promise<void>} never resolves; always rejects.
     */
    flashFirmware () {
        throw new Error('CloudClient.flashFirmware: firmware restore is not available in cloud mode');
    }

    /**
     * Yield each newline-delimited JSON frame from a streamed response body.
     * @param {ReadableStream} body - the response body.
     * @yields {{type: string, payload: object}} one frame per line.
     * @private
     */
    static async* _ndjson (body) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
            const {done, value} = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {stream: true});
            const lines = buffer.split('\n');
            // The last element is whatever follows the final newline: a partial frame, or ''.
            buffer = lines.pop();
            for (const line of lines) {
                if (line) yield JSON.parse(line);
            }
        }
    }

    /**
     * The server's `{code, message}` error body, falling back to the status when it isn't JSON.
     * @param {Response} response - the failed response.
     * @returns {Promise<string>} the message to throw.
     * @private
     */
    static async _errorMessage (response) {
        try {
            const {message} = await response.json();
            if (message) return message;
        } catch (err) {
            // Not a JSON error body (e.g. a proxy's HTML 502); fall through to the status.
        }
        return `CloudClient.compile: server returned ${response.status}`;
    }

    /**
     * Flash a compiled artifact to the connected board with esptool-js, over the same Web Serial port.
     * ESP targets only — see {@link CloudClient._flashParts}.
     *
     * esptool drives the port itself (its own baud rates, DTR/RTS reset sequence), so the port is
     * handed over: monitor stopped, port closed, esptool run, then reopened at the monitor's rate.
     * @param {Device} device - the selected device (supplies `uploadSpeed`).
     * @param {Artifact} artifact - the artifact from `compile()`.
     * @param {import('./callbacks').StreamCallbacks} [callbacks] - optional `{onLog, onProgress}`.
     * @returns {Promise<void>} resolves once the flash completes.
     */
    async flash (device, artifact, callbacks) {
        if (!this._port) {
            throw new Error('CloudClient.flash: no open port; call connect() first');
        }
        const {onLog, onProgress} = withDefaults(callbacks);
        const fileArray = CloudClient._flashParts(artifact);
        const {uploadSpeed = DEFAULT_FLASH_BAUD} = device.getUploadConfig();
        const {ESPLoader, Transport} = await this._loadEsptool();

        const total = fileArray.reduce((sum, {data}) => sum + data.length, 0);
        // Bytes in the images before the one being written, so progress climbs once across all four
        // rather than restarting per image.
        const offsets = [];
        fileArray.reduce((sum, {data}, index) => (offsets[index] = sum) + data.length, 0);

        log.info(`CloudClient.flash: writing ${fileArray.length} image(s), ${total} bytes at ${uploadSpeed} baud`);
        await this.closeMonitor();
        await this._port.close();

        const transport = new Transport(this._port, true);
        try {
            const loader = new ESPLoader({
                transport,
                baudrate: uploadSpeed,
                romBaudrate: DEFAULT_BAUD_RATE,
                terminal: {
                    clean: () => {},
                    write: chunk => onLog(chunk),
                    writeLine: line => onLog(`${line}\n`)
                }
            });
            await loader.main();
            await loader.writeFlash({
                fileArray,
                flashSize: 'keep',
                flashMode: 'keep',
                flashFreq: 'keep',
                eraseAll: false,
                compress: true,
                reportProgress: (index, written) => onProgress({
                    phase: `writing image ${index + 1}/${fileArray.length}`,
                    percent: ((offsets[index] + written) / total) * 100
                })
            });
            await loader.after();
            log.info('CloudClient.flash: flash complete');
        } finally {
            await transport.disconnect();
            // Hand the port back however the flash ended, so the monitor can reopen.
            await this._port.open({baudRate: this._baudRate});
        }
    }

    /**
     * The images to write, as esptool-js `{data, address}` entries. esptool-js takes binary strings,
     * which is exactly what `atob` yields from the server's base64.
     * @param {Artifact} artifact - the compiled artifact.
     * @returns {Array.<{data: string, address: number}>} the images in flash order.
     * @private
     */
    static _flashParts (artifact) {
        if (!artifact.parts || artifact.parts.length === 0) {
            // AVR ships a single Intel HEX with its addresses inline; flashing it needs STK500 over
            // Web Serial, which esptool-js cannot do.
            throw new Error('CloudClient.flash: web flashing supports ESP boards only; ' +
                'this build produced a single-image (AVR) artifact');
        }
        return artifact.parts.map(part => ({
            data: atob(part.data),
            address: part.offset
        }));
    }

    /**
     * esptool-js is ESM with bundler-style imports, so it is loaded lazily: Node-based tests inject a
     * fake and never resolve it, and the browser bundle keeps it out of the main chunk.
     * @returns {Promise<{ESPLoader: Function, Transport: Function}>} the esptool-js entry points.
     * @private
     */
    async _loadEsptool () {
        if (!this._esptool) {
            this._esptool = await import('esptool-js');
        }
        return this._esptool;
    }

    /**
     * Start reading the connected port, emitting inbound bytes on the runtime as `SERIAL_DATA`. Web
     * Serial cannot change the rate of an open port, so a different `baudRate` reopens it.
     * @param {{baudRate: number}} options - the monitor baud rate.
     * @returns {Promise<void>} resolves once the monitor is reading.
     */
    async openMonitor (options) {
        if (!this._port) {
            throw new Error('CloudClient.openMonitor: no open port; call connect() first');
        }
        await this.closeMonitor();

        const {baudRate} = options || {};
        if (baudRate && baudRate !== this._baudRate) {
            log.info(`CloudClient.openMonitor: reopening the port at ${baudRate} baud`);
            await this._port.close();
            await this._port.open({baudRate});
            this._baudRate = baudRate;
        }

        const reader = this._port.readable.getReader();
        this._monitor = {reader, pump: this._pump(reader)};
        log.info(`CloudClient.openMonitor: reading at ${this._baudRate} baud`);
    }

    /**
     * Write bytes to the connected port. Fire-and-forget, matching the {@link Client} contract.
     * @param {string} data - the bytes to send.
     * @returns {void}
     */
    writeMonitor (data) {
        if (!this._port) {
            log.warn('CloudClient.writeMonitor: no open port; dropping write');
            return;
        }
        const writer = this._port.writable.getWriter();
        writer.write(new TextEncoder().encode(data))
            .catch(err => log.warn(`CloudClient.writeMonitor: write failed (${err.message})`))
            .finally(() => writer.releaseLock());
    }

    /**
     * Stop reading and release the port's readable stream, leaving the port open.
     * @returns {Promise<void>} resolves once the reader's lock is released.
     */
    async closeMonitor () {
        if (!this._monitor) return;
        const {reader, pump} = this._monitor;
        this._monitor = null;
        log.info('CloudClient.closeMonitor: stopping the reader');
        await reader.cancel();
        // The pump releases the lock as it unwinds, so the port is only safe to close after it settles.
        await pump;
    }

    /**
     * Drain the port until cancelled, emitting each chunk as `SERIAL_DATA`.
     * @param {ReadableStreamDefaultReader} reader - the locked reader.
     * @returns {Promise<void>} resolves when the stream ends or is cancelled.
     * @private
     */
    async _pump (reader) {
        const decoder = new TextDecoder();
        try {
            for (;;) {
                const {done, value} = await reader.read();
                if (done) break;
                this.runtime.emit(this.runtime.constructor.SERIAL_DATA, decoder.decode(value, {stream: true}));
            }
        } catch (err) {
            // A yanked USB cable surfaces here; the port is gone, so report it rather than fail silently.
            log.warn(`CloudClient: serial read failed (${err.message})`);
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * @returns {SerialPort} the open port, which the flasher and serial monitor borrow.
     */
    get transport () {
        if (!this._port) {
            throw new Error('CloudClient: no open port; call connect() first');
        }
        return this._port;
    }
}

module.exports = CloudClient;
