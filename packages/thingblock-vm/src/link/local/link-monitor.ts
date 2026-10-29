import log from '../../util/log';
import type LinkSession from './link-session';
import type {SerialMonitor} from '../types';

/**
 * The serial monitor over the helper's `monitorOpen` / `monitorWrite` / `monitorClose`. It borrows
 * the connected port like the flasher does. After the open resolves, inbound serial bytes arrive as
 * `monitorData` frames on the open request's id and are emitted on the runtime as `SERIAL_DATA` by
 * the session, which keeps the routing in `session.monitor` because those frames outlive the
 * request's terminal `result`.
 */
export default class LinkMonitor implements SerialMonitor {
    private readonly session: LinkSession;

    constructor (session: LinkSession) {
        this.session = session;
    }

    /** Open the monitor on the connected port, resolving once the helper reports it open. */
    async openMonitor (options: {baudRate: number}): Promise<void> {
        const {connectedTarget} = this.session;
        if (!connectedTarget) {
            throw new Error('LinkClient.openMonitor: no connected port; call connect() first');
        }
        const port = connectedTarget.id;
        const {baudRate} = options;
        // Pre-allocate the id so the session can route this request's post-`result` frames.
        const id = this.session.allocateId();
        this.session.monitor = {id, opened: false};
        log.info(`LinkClient.openMonitor: opening serial monitor on ${port} at ${baudRate} baud`);
        try {
            await this.session.request('monitorOpen', {port, baudRate}, null, false, id);
        } catch (err) {
            // A failed open must leave no routing behind, whichever path rejected it.
            if (this.session.monitor && this.session.monitor.id === id) this.session.monitor = null;
            throw err;
        }
    }

    /**
     * Write bytes to the open monitor. Fire-and-forget: the helper routes by session and sends no
     * reply. Dropped with a warning when no monitor is open or the socket is not.
     */
    writeMonitor (data: string): void {
        const {monitor} = this.session;
        if (!monitor) {
            log.warn('LinkClient.writeMonitor: no open monitor; dropping write');
            return;
        }
        if (!this.session.isSocketOpen) {
            log.warn(`LinkClient.writeMonitor: socket not open (monitor ${monitor.id}); dropping write`);
            return;
        }
        this.session.send(monitor.id, 'monitorWrite', {data});
    }

    /** Close the monitor via the helper's `monitorClose`, leaving the link connected. */
    async closeMonitor (): Promise<void> {
        if (!this.session.monitor) return;
        log.info('LinkClient.closeMonitor: closing the serial monitor');
        await this.session.request('monitorClose', {});
        this.session.monitor = null;
    }
}
