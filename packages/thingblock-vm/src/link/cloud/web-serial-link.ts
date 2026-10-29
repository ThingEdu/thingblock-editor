/**
 * Baud rate the port is opened at on connect. This is the serial-monitor rate, distinct from the
 * per-device flash `uploadSpeed`; the flasher reopens the port at its own rate when flashing.
 */
export const DEFAULT_BAUD_RATE = 115200;

/** The Web Serial port surface the cloud backend uses; the DOM lib ships no Web Serial types. */
export interface SerialPortLike {
    readonly readable: ReadableStream<Uint8Array> | null
    readonly writable: WritableStream<Uint8Array> | null
    open (options: {baudRate: number}): Promise<void>
    close (): Promise<void>
}

/** A Web Serial port-picker filter, narrowing the picker to one USB VID/PID. */
export interface WebSerialFilter {
    usbVendorId: number
    usbProductId: number
}

/**
 * The Web Serial port the cloud backend's capabilities share: the granted, open port and the rate it
 * is currently open at. The connection opens and closes it, the monitor reads and writes it, and the
 * flasher hands it over to esptool and back, so they all borrow this one holder instead of each
 * keeping a port of its own.
 */
export default class WebSerialLink {
    /** The granted, open serial port; null when disconnected. */
    port: SerialPortLike | null = null;

    /** The rate the port is currently open at. */
    baudRate = DEFAULT_BAUD_RATE;

    /**
     * The open port.
     * @param operation - the calling method, named in the error.
     */
    requirePort (operation: string): SerialPortLike {
        if (!this.port) {
            throw new Error(`CloudClient.${operation}: no open port; call connect() first`);
        }
        return this.port;
    }
}
