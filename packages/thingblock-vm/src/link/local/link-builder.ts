import log from '../../util/log';
import {withDefaults} from '../callbacks';
import {composeFqbn} from '../fqbn';
import type LinkSession from './link-session';
import type {LibRef} from '../../devices/peripheral-registry';
import type {Artifact, Builder, LinkDevice, PlatformStatus, StreamCallbacks} from '../types';

/**
 * The boards-platform (core) id for a device: the first two FQBN segments, `vendor:architecture`.
 * Board-menu options (`composeFqbn`) never affect it.
 * @returns the platform id, e.g. `esp32:esp32`.
 */
const platformId = (device: LinkDevice): string => device.fqbn.split(':')
    .slice(0, 2)
    .join(':');

/**
 * Firmware builds and boards-platform management through the helper, which fronts the arduino-cli
 * daemon.
 */
export default class LinkBuilder implements Builder {
    private readonly session: LinkSession;

    constructor (session: LinkSession) {
        this.session = session;
    }

    /**
     * Build firmware via the helper, streaming `log`/`progress` to `callbacks` until the helper replies
     * with the located artifact. The helper keeps the binary on disk, so the artifact carries a `path`
     * (not bytes) that `flash()` hands back to the helper's `upload`. Vendored libs travel as
     * `{pack, lib}` references the helper resolves from its resource root — no lib bytes cross the
     * socket.
     */
    async compile (
        device: LinkDevice,
        source: string,
        libs: LibRef[] = [],
        callbacks?: StreamCallbacks
    ): Promise<Artifact> {
        const fqbn = composeFqbn(device);
        log.info(`LinkClient.compile: requesting build for ${fqbn} with ${libs.length} vendored lib(s)`);
        const {artifact} = await this.session.request<{artifact: Artifact}>(
            'compile',
            {fqbn, options: {}, source, libs},
            withDefaults(callbacks),
            true
        );
        log.info(`LinkClient.compile: artifact ready (format=${artifact.format})`);
        return artifact;
    }

    /** Abort the in-flight compile or platform install; see {@link LinkSession.cancel}. */
    cancel (): void {
        this.session.cancel();
    }

    /**
     * The install status of the device's boards platform, from the helper's `GET /api/platforms/{id}`.
     * A one-shot read, so it goes over the helper's HTTP API rather than the WS envelope. A 404 means
     * the helper's package indexes don't know the platform — reported as uninstalled-and-unknown
     * rather than thrown, so the GUI can message it; other failures (helper down, daemon error) throw.
     */
    async getPlatformStatus (device: LinkDevice): Promise<PlatformStatus> {
        const id = platformId(device);
        const response = await this.session.fetch(`${this.session.httpOrigin}/api/platforms/${encodeURIComponent(id)}`);
        if (response.status === 404) {
            log.warn(`LinkClient.getPlatformStatus: helper does not index platform ${id}`);
            return {id, name: id, installed: false, known: false};
        }
        if (!response.ok) {
            throw new Error(`LinkClient.getPlatformStatus: helper returned ${response.status} for ${id}`);
        }
        const status = await response.json();
        return {...status, known: true};
    }

    /**
     * Download and install the device's boards platform via the helper's `installPlatform`, streaming
     * download/install progress and log to `callbacks` until the helper replies. Cancellable via
     * {@link cancel}, like compile. The helper reinitializes the arduino-cli instance before replying,
     * so the platform is compilable as soon as this resolves.
     */
    async installPlatform (device: LinkDevice, callbacks?: StreamCallbacks): Promise<void> {
        const platform = platformId(device);
        log.info(`LinkClient.installPlatform: requesting install of ${platform}`);
        await this.session.request('installPlatform', {platform}, withDefaults(callbacks), true);
        log.info(`LinkClient.installPlatform: ${platform} installed`);
    }
}
