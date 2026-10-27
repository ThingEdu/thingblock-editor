import LinkBuilder from './link-builder';
import LinkConnection from './link-connection';
import LinkFlasher from './link-flasher';
import LinkMonitor from './link-monitor';
import LinkSession, {type LinkSessionOptions} from './link-session';
import type Runtime from '../../engine/runtime';
import type {Backend} from '../types';

export type {LinkSessionOptions as LocalOptions};

/** The local backend's parts, plus the shared socket they ride. */
export interface LocalBackend extends Backend {
    /** Exposed so a host or test can drive the socket directly. */
    session: LinkSession
}

/** Whether a WebSocket implementation is available in this environment. */
export const isLocalSupported = (): boolean => typeof globalThis.WebSocket !== 'undefined';

/**
 * Build the backend for the native helper (thingblock-link) over a WebSocket. The helper is a
 * translating proxy in front of the arduino-cli daemon, so every capability — board discovery, build,
 * flash, serial monitor — rides one shared {@link LinkSession}, which opens its socket lazily.
 *
 * The WebSocket and its URL are injectable so the VM's tests can drive a fake socket with no server.
 * @param runtime - the VM runtime, used to emit connection lifecycle and serial events.
 * @param options - injection points; see {@link LinkSessionOptions}.
 */
export const createLocalBackend = (runtime: Runtime, options: LinkSessionOptions = {}): LocalBackend => {
    const session = new LinkSession(runtime, options);
    return {
        connection: new LinkConnection(runtime, session),
        builder: new LinkBuilder(session),
        flasher: new LinkFlasher(session),
        monitor: new LinkMonitor(session),
        resourceOrigin: session.resourceOrigin,
        session
    };
};
