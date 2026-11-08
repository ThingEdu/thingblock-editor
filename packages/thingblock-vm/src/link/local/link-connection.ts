import log from '../../util/log';
import {LinkEvent} from '../../event/event-name';
import type Runtime from '../../engine/runtime';
import type LinkSession from './link-session';
import type {Connection, ConnectionTarget, LinkDevice} from '../types';

/**
 * Board discovery over the helper's HTTP API and port binding over its session. `connect` binds the
 * session to a port after the helper checks a matching board is on it, and the session's close
 * handler clears it again when the socket drops.
 */
export default class LinkConnection implements Connection {
    private readonly runtime: Runtime;
    private readonly session: LinkSession;

    constructor (runtime: Runtime, session: LinkSession) {
        this.runtime = runtime;
        this.session = session;
    }

    /**
     * The helper's `GET /api/boards`, narrowed to the device's `getUploadConfig().pnpid`, with its
     * `{port, label}` targets mapped onto the VM-facing `{id, name}` shape.
     */
    async listBoards (device: LinkDevice): Promise<ConnectionTarget[]> {
        const {pnpid = []} = device.getUploadConfig();
        if (pnpid.length === 0) {
            throw new Error(`LinkClient.listBoards: device ${device.fqbn} has no pnpid to discover boards by`);
        }
        log.info(`LinkClient.listBoards: requesting boards matching pnpid=${JSON.stringify(pnpid)}`);
        const query = new URLSearchParams({pnpid: pnpid.join(',')});
        const response = await this.session.fetch(`${this.session.httpOrigin}/api/boards?${query}`);
        if (!response.ok) {
            throw new Error(`LinkClient.listBoards: helper returned ${response.status}`);
        }
        const {targets}: {targets: Array<{port: string, label: string}>} = await response.json();
        log.info(`LinkClient.listBoards: helper returned ${targets.length} board(s)`);
        return targets.map(target => ({id: target.port, name: target.label}));
    }

    /**
     * Bind the helper session to the target's port. The helper rejects with `invalidRequest` when no
     * board with one of the device's pnpids is on that port, or when the session is already connected.
     * @param device - the selected device (supplies the pnpids the helper checks).
     * @param target - the target chosen from `listBoards()`; `id` is the port.
     */
    async connect (device: LinkDevice, target: ConnectionTarget): Promise<void> {
        const {pnpid = []} = device.getUploadConfig();
        log.info(`LinkClient.connect: connecting the helper to port ${target.id}`);
        await this.session.request('connect', {port: target.id, pnpid});
        this.session.connectedTarget = target;
        log.info('LinkClient.connect: connected');
        this.runtime.events.emit(LinkEvent.DEVICE_CONNECTED);
    }

    /**
     * Disconnect the helper session, which also cancels its in-flight requests. Safe to call when
     * already disconnected.
     */
    async disconnect (): Promise<void> {
        if (!this.session.connectedTarget) {
            log.info('LinkClient.disconnect: no connected port; nothing to do');
            return;
        }
        log.info('LinkClient.disconnect: disconnecting the helper session');
        await this.session.request('disconnect', {});
        // The helper closes any open monitor as part of disconnect; drop our routing to match.
        this.session.monitor = null;
        this.session.connectedTarget = null;
        this.runtime.events.emit(LinkEvent.DEVICE_DISCONNECTED);
    }

    get isConnected (): boolean {
        return this.session.connectedTarget !== null;
    }

    /** The helper session, which the flasher and the monitor drive the connected port through. */
    get transport (): LinkSession {
        return this.session;
    }
}
