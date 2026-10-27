import {createCloudBackend} from '../link/cloud';
import {createLocalBackend, type LocalBackend} from '../link/local';
import type Runtime from '../engine/runtime';
import type {Backend} from '../link/types';

/**
 * Default serial-monitor baud rate, used until the GUI changes it via {@link VirtualMachine#setMonitorBaud}.
 */
const DEFAULT_MONITOR_BAUD = 115200;

/** The host-supplied resource base global; see {@link LinkController#local}. */
type ResourceBaseGlobal = {__THINGBLOCK_RESOURCE_BASE__?: string};

/**
 * The device-link state owned by the VM: the helper and cloud backends, which one is active, and the
 * serial-monitor baud rate. `getBackend()` hands out the active backend as its capability interfaces
 * (connection, builder, flasher, monitor), and the VM's link mixin drives the board operations through
 * them.
 */
export default class LinkController {
    /**
     * The native-helper backend. Constructing it is free — its socket opens lazily on first use.
     *
     * `__THINGBLOCK_RESOURCE_BASE__` is the seam for a host that serves the resource packs itself (the
     * desktop shell, which bundles them alongside the editor); unset everywhere else, leaving the
     * helper's own `/resources` route in play.
     */
    readonly local: LocalBackend;

    /** The server-build (full-web) backend, over Web Serial; its port opens lazily on first use. */
    readonly cloud: Backend;

    /**
     * Baud rate the serial monitor is (re)opened at. The active backend auto-opens a monitor on
     * connect and reopens around upload, so it needs a remembered rate; the GUI changes it via
     * `setMonitorBaud`.
     */
    monitorBaud = DEFAULT_MONITOR_BAUD;

    /**
     * The backend board operations route through. `setLinkMode` swaps it between `local` and `cloud`;
     * both persist so a mode switch keeps each transport's state. Public so a test can substitute a
     * fake.
     */
    backend: Backend;

    /**
     * @param runtime - the VM runtime, used by the backends to emit connection and serial events.
     */
    constructor (runtime: Runtime) {
        this.local = createLocalBackend(runtime, {
            resourceBase: (globalThis as ResourceBaseGlobal).__THINGBLOCK_RESOURCE_BASE__ || null
        });
        this.cloud = createCloudBackend(runtime);
        this.backend = this.local;
    }

    /** The active backend, as its connection, builder, flasher and monitor interfaces. */
    getBackend (): Backend {
        return this.backend;
    }

    /**
     * Select the device-link backend: `'cloud'` for the web/Web Serial one, anything else for the
     * native helper. Disconnects the current backend first so switching never leaves a dangling link.
     * @param mode - the link mode, `'link'` or `'cloud'`.
     */
    setLinkMode (mode: string): void {
        const next = mode === 'cloud' ? this.cloud : this.local;
        if (next === this.backend) return;
        if (this.backend.connection.isConnected) {
            this.backend.connection.disconnect();
        }
        this.backend = next;
    }
}
