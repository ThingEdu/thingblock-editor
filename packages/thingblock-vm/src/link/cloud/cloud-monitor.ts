import log from '../../util/log';
import {LinkEvent} from '../../event/event-name';
import type Runtime from '../../engine/runtime';
import type WebSerialLink from './web-serial-link';
import type {SerialMonitor} from '../types';

/**
 * The serial monitor over the Web Serial port: a reader pumping inbound bytes onto the runtime as
 * `SERIAL_DATA`, and a writer for outbound bytes.
 */
export default class CloudMonitor implements SerialMonitor {
    private readonly runtime: Runtime;
    private readonly link: WebSerialLink;

    /**
     * The open monitor's reader and its detached pump, or null when none. Web Serial locks
     * `port.readable` while a reader exists, so the lock must be released before the port closes —
     * hence keeping the pump promise to await.
     */
    private reading: {reader: ReadableStreamDefaultReader<Uint8Array>, pump: Promise<void>} | null = null;

    constructor (runtime: Runtime, link: WebSerialLink) {
        this.runtime = runtime;
        this.link = link;
    }

    /**
     * Start reading the connected port, emitting inbound bytes on the runtime as `SERIAL_DATA`. Web
     * Serial cannot change the rate of an open port, so a different `baudRate` reopens it.
     */
    async openMonitor (options: {baudRate: number}): Promise<void> {
        const port = this.link.requirePort('openMonitor');
        await this.closeMonitor();

        const {baudRate} = options || {};
        if (baudRate && baudRate !== this.link.baudRate) {
            log.info(`CloudClient.openMonitor: reopening the port at ${baudRate} baud`);
            await port.close();
            await port.open({baudRate});
            this.link.baudRate = baudRate;
        }

        const reader = port.readable!.getReader();
        this.reading = {reader, pump: this.pump(reader)};
        log.info(`CloudClient.openMonitor: reading at ${this.link.baudRate} baud`);
    }

    /** Write bytes to the connected port. Fire-and-forget, matching the {@link SerialMonitor} contract. */
    writeMonitor (data: string): void {
        const {port} = this.link;
        if (!port) {
            log.warn('CloudClient.writeMonitor: no open port; dropping write');
            return;
        }
        const writer = port.writable!.getWriter();
        writer.write(new TextEncoder().encode(data))
            .catch((err: Error) => log.warn(`CloudClient.writeMonitor: write failed (${err.message})`))
            .finally(() => writer.releaseLock());
    }

    /** Stop reading and release the port's readable stream, leaving the port open. */
    async closeMonitor (): Promise<void> {
        if (!this.reading) return;
        const {reader, pump} = this.reading;
        this.reading = null;
        log.info('CloudClient.closeMonitor: stopping the reader');
        await reader.cancel();
        // The pump releases the lock as it unwinds, so the port is only safe to close after it settles.
        await pump;
    }

    /** Drain the port until cancelled, emitting each chunk as `SERIAL_DATA`. */
    private async pump (reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
        const decoder = new TextDecoder();
        try {
            for (;;) {
                const {done, value} = await reader.read();
                if (done) break;
                this.runtime.events.emit(LinkEvent.SERIAL_DATA, decoder.decode(value, {stream: true}));
            }
        } catch (err) {
            // A yanked USB cable surfaces here; the port is gone, so report it rather than fail silently.
            log.warn(`CloudClient: serial read failed (${(err as Error).message})`);
        } finally {
            reader.releaseLock();
        }
    }
}
