import CloudBuilder from './cloud-builder';
import CloudConnection from './cloud-connection';
import CloudFlasher, {type EsptoolModule} from './cloud-flasher';
import CloudMonitor from './cloud-monitor';
import WebSerialLink from './web-serial-link';
import type Runtime from '../../engine/runtime';
import type {Backend} from '../types';

export {filtersFromDevice, isWebSerialSupported as isCloudSupported} from './cloud-connection';

/**
 * Default address of the cloud build server (thingblock-link-cloud).
 */
const DEFAULT_URL = 'http://localhost:8080';

export interface CloudOptions {
    /** The build server origin (defaults to `http://localhost:8080`). */
    url?: string
    /** The fetch function (defaults to the global one). */
    fetch?: typeof fetch
    /** esptool-js `{ESPLoader, Transport}` (defaults to importing it). */
    esptool?: EsptoolModule | null
}

/**
 * Build the backend for the server-build (full-web) mode: compile on a cloud server, and hold and flash
 * the board in the browser through Web Serial. The connection, monitor and flasher share one
 * {@link WebSerialLink}, the granted port.
 * @param runtime - the VM runtime, used to emit connection lifecycle and serial events.
 * @param options - injection points.
 */
export const createCloudBackend = (runtime: Runtime, {
    url = DEFAULT_URL,
    fetch = globalThis.fetch && globalThis.fetch.bind(globalThis),
    esptool = null
}: CloudOptions = {}): Backend => {
    const origin = url.replace(/\/$/, '');
    const link = new WebSerialLink();
    const monitor = new CloudMonitor(runtime, link);
    return {
        connection: new CloudConnection(runtime, link, monitor),
        builder: new CloudBuilder(origin, fetch),
        flasher: new CloudFlasher(link, monitor, esptool),
        monitor,
        // The build server's `/resources` static route serves the same packs it compiles against.
        resourceOrigin: `${origin}/resources`
    };
};
