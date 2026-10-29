import log from '../../util/log';
import {LinkEvent} from '../../event/event-name';
import type Runtime from '../../engine/runtime';
import type LinkSession from './link-session';
import type {Connection, ConnectionTarget, LinkDevice} from '../types';

/**
 * Board discovery and port selection over the helper's session. `connect` records the selected port
 * with the helper (no daemon round-trip — the port is validated later at upload/monitor time), and
 * the session's close handler clears it again when the socket drops.
 */
export default class LinkConnection implements Connection {
    private readonly runtime: Runtime;
    private readonly session: LinkSession;

    constructor (runtime: Runtime, session: LinkSession) {
        this.runtime = runtime;
        this.session = session;
    }

    /**
     * gRPC `BoardList` via the helper, narrowed to the device's known USB ids. The helper reconstructs
     * each port's PNP id and keeps those matching `getUploadConfig().pnpid`, returning `{port, label}`
     * targets; this maps them onto the VM-facing `{id, name}` shape.
     */
    async listBoards (device: LinkDevice): Promise<ConnectionTarget[]> {
        const {pnpid = []} = device.getUploadConfig();
        log.info(`LinkClient.listBoards: requesting boards matching pnpid=${JSON.stringify(pnpid)}`);
        const {targets} = await this.session.request<{targets: Array<{port: string, label: string}>}>(
            'listBoards',
            {pnpid}
        );
        log.info(`LinkClient.listBoards: helper returned ${targets.length} board(s)`);
        return targets.map(target => ({id: target.port, name: target.label}));
    }

    /**
     * Record the selected port with the helper, which stores it on this socket's session and replies
     * `result {}`.
     * @param target - the target chosen from `listBoards()`; `id` is the port.
     */
    async connect (target: ConnectionTarget): Promise<void> {
        log.info(`LinkClient.connect: selecting port ${target.id} with the helper`);
        await this.session.request('connect', {port: target.id});
        this.session.connectedTarget = target;
        log.info('LinkClient.connect: connected');
        this.runtime.events.emit(LinkEvent.DEVICE_CONNECTED);
    }

    /** Clear the helper's selected port. Safe to call when already disconnected. */
    async disconnect (): Promise<void> {
        if (!this.session.connectedTarget) {
            log.info('LinkClient.disconnect: no selected port; nothing to do');
            return;
        }
        log.info('LinkClient.disconnect: clearing the helper-selected port');
        await this.session.request('disconnect', {});
        // The helper closes any open monitor as part of disconnect; drop our routing to match.
        this.session.monitor = null;
        this.session.connectedTarget = null;
        this.runtime.events.emit(LinkEvent.DEVICE_DISCONNECTED);
    }

    get isConnected (): boolean {
        return this.session.connectedTarget !== null;
    }

    /** The helper session, which the flasher and the monitor drive the selected port through. */
    get transport (): LinkSession {
        return this.session;
    }
}
