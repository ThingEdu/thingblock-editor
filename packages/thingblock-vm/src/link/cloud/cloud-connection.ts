import log from '../../util/log';
import {LinkEvent} from '../../event/event-name';
import {DEFAULT_BAUD_RATE, type SerialPortLike, type WebSerialFilter} from './web-serial-link';
import type Runtime from '../../engine/runtime';
import type WebSerialLink from './web-serial-link';
import type {Connection, ConnectionTarget, LinkDevice, SerialMonitor} from '../types';

/**
 * Id of the single synthetic target {@link CloudConnection.listBoards} returns. Web Serial cannot
 * enumerate ports, so the board list shows one entry that stands in for "the browser port picker";
 * selecting it drives `connect()`, which opens the picker within the click's user gesture.
 */
const WEB_SERIAL_TARGET_ID = 'web-serial';

/** A target that also carries picker filters, for a caller that wants to narrow the native picker. */
export type WebSerialTarget = ConnectionTarget & {filters?: WebSerialFilter[]};

/** Whether Web Serial is available in this environment (Chromium-based browsers). */
export const isWebSerialSupported = (): boolean => typeof navigator !== 'undefined' && 'serial' in navigator;

const unsupportedMessage = 'Web Serial unavailable — navigator.serial is missing. ' +
    'It requires a Chromium-based browser in a secure context (https:// or localhost).';

/**
 * Web Serial filters narrowing the native picker to a device's known USB VID/PIDs. Parses the
 * Windows PNP-ID strings in `getUploadConfig().pnpid` (e.g. 'USB\\VID_2341&PID_0043') into the
 * numeric `{usbVendorId, usbProductId}` form `requestPort` expects.
 * @returns the filters (empty if none parse).
 */
export const filtersFromDevice = (device: Pick<LinkDevice, 'getUploadConfig'>): WebSerialFilter[] => {
    const {pnpid = []} = device.getUploadConfig();
    const filters: WebSerialFilter[] = [];
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
};

/**
 * Opening and closing the board's serial port in the browser through the Web Serial API. The API is a
 * native browser global, not a bundled dependency, so the logic lives in the VM.
 *
 * Discovery is not enumerable in Web Serial without a user gesture, so `listBoards()` returns one
 * stand-in entry and `connect()` opens the browser's native port picker instead.
 */
export default class CloudConnection implements Connection {
    private readonly runtime: Runtime;
    private readonly link: WebSerialLink;
    private readonly monitor: SerialMonitor;

    /**
     * @param runtime - the VM runtime, used to emit connection lifecycle events.
     * @param link - the shared port holder this connection opens and closes.
     * @param monitor - the monitor, closed before the port since the port cannot close while the
     *   monitor holds a lock on its readable stream.
     */
    constructor (runtime: Runtime, link: WebSerialLink, monitor: SerialMonitor) {
        this.runtime = runtime;
        this.link = link;
        this.monitor = monitor;
    }

    /**
     * Web Serial cannot enumerate ports without a user gesture, so instead of a real list this returns
     * one synthetic target standing in for the browser's port picker, labelled with the selected
     * device. The GUI shows it as a single board tile; selecting it calls `connect()`, which opens the
     * native picker within that click's user gesture. Returns nothing when Web Serial is unavailable.
     */
    listBoards (device: LinkDevice): Promise<ConnectionTarget[]> {
        if (!isWebSerialSupported()) {
            log.error(`CloudClient.listBoards: ${unsupportedMessage}`);
            return Promise.resolve([]);
        }
        log.info('CloudClient.listBoards: returning the browser-picker entry; ' +
            'selecting it opens the Web Serial port picker via connect()');
        return Promise.resolve([{id: WEB_SERIAL_TARGET_ID, name: device.getDeviceInfo().name}]);
    }

    /**
     * Open the native port picker, then open the chosen port. Requires a user gesture (the picker is
     * gesture-gated by the browser). Emits `DEVICE_CONNECTED` on success.
     * @param target - optional Web Serial filters (see {@link filtersFromDevice}); when omitted, the
     *   picker shows all serial ports.
     */
    async connect (target: WebSerialTarget | null = null): Promise<void> {
        if (!isWebSerialSupported()) {
            log.error(`CloudClient.connect: ${unsupportedMessage}`);
            throw new Error('Web Serial is not available in this browser');
        }
        const filters = (target && target.filters) || [];
        log.info(`CloudClient.connect: opening the browser port picker (filters=${JSON.stringify(filters)})`);
        const {serial} = navigator as unknown as {serial: {requestPort (o: object): Promise<SerialPortLike>}};
        let port;
        try {
            port = await serial.requestPort({filters});
        } catch (err) {
            // A thrown NotFoundError here usually means the user dismissed the picker without choosing.
            log.warn(`CloudClient.connect: no port selected (${(err as Error).name}: ${(err as Error).message})`);
            throw err;
        }
        log.info(`CloudClient.connect: port selected, opening at ${DEFAULT_BAUD_RATE} baud`);
        try {
            await port.open({baudRate: DEFAULT_BAUD_RATE});
        } catch (err) {
            // On Linux this is often a permissions problem: add the user to the dialout/uucp group.
            const {name, message} = err as Error;
            log.error(`CloudClient.connect: failed to open the port (${name}: ${message})`);
            throw err;
        }
        this.link.port = port;
        this.link.baudRate = DEFAULT_BAUD_RATE;
        log.info('CloudClient.connect: connected');
        this.runtime.events.emit(LinkEvent.DEVICE_CONNECTED);
    }

    /** Close the port and release it. Safe to call when already disconnected. Emits `DEVICE_DISCONNECTED`. */
    async disconnect (): Promise<void> {
        const {port} = this.link;
        if (!port) {
            log.info('CloudClient.disconnect: no open port; nothing to do');
            return;
        }
        log.info('CloudClient.disconnect: closing the port');
        await this.monitor.closeMonitor();
        await port.close();
        this.link.port = null;
        this.runtime.events.emit(LinkEvent.DEVICE_DISCONNECTED);
    }

    get isConnected (): boolean {
        return this.link.port !== null;
    }

    /** The open port, which the flasher and serial monitor borrow. */
    get transport (): SerialPortLike {
        if (!this.link.port) {
            throw new Error('CloudClient: no open port; call connect() first');
        }
        return this.link.port;
    }
}
