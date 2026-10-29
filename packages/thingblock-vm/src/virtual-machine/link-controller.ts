import {createCloudBackend} from '../link/cloud';
import {createLocalBackend} from '../link/local';
import type Runtime from '../engine/runtime';
import {VMEvent} from '../event/event-name';
import log from '../util/log';
import type DeviceManager from './device-manager';
import type {
    Artifact,
    Backend,
    ConnectionTarget,
    Flasher,
    LinkDevice,
    PlatformStatus,
    StreamCallbacks
} from '../link/types';

const DEFAULT_MONITOR_BAUD = 115200;

type ResourceBaseGlobal = {__THINGBLOCK_RESOURCE_BASE__?: string};

export type LinkMode = 'link' | 'cloud';

export default class LinkController {
    monitorBaud = DEFAULT_MONITOR_BAUD;

    backend: Backend;

    private mode = 'link';

    private readonly runtime: Runtime;

    private readonly devices: DeviceManager;

    constructor (runtime: Runtime, devices: DeviceManager) {
        this.runtime = runtime;
        this.devices = devices;
        this.backend = this.createBackend(this.mode);

        this.runtime.events.on(VMEvent.WRITE_MONITOR, (text: string) => {
            if (!this.backend.connection.isConnected) return;
            // Arduino sketches read line-terminated input.
            this.backend.monitor.writeMonitor(`${text}\n`);
        });
    }

    setLinkMode (mode: LinkMode): void {
        if (mode === this.mode) return;
        if (this.backend.connection.isConnected) {
            this.backend.connection.disconnect();
        }
        this.mode = mode;
        this.backend = this.createBackend(mode);
    }

    async listBoards (deviceId: string): Promise<ConnectionTarget[]> {
        const device = this.getDevice(deviceId);
        return this.backend.connection.listBoards(device);
    }

    async connectBoard (target: ConnectionTarget): Promise<void> {
        const {connection, monitor} = this.backend;
        await connection.connect(target);
        monitor.openMonitor({baudRate: this.monitorBaud})
            .catch((err: Error) => log.warn(`connectBoard: serial monitor did not open: ${err.message}`));
    }

    disconnectBoard (): Promise<void> {
        return this.backend.connection.disconnect();
    }

    async compile (deviceId: string, source: string, callbacks?: StreamCallbacks): Promise<Artifact> {
        const device = this.getDevice(deviceId);
        return this.backend.builder.compile(device, source, this.devices.getActivePeripheralLibs(), callbacks);
    }

    async upload (deviceId: string, artifact: Artifact, callbacks?: StreamCallbacks): Promise<void> {
        const device = this.getDevice(deviceId);
        return this.flashWithMonitorFreed(flasher => flasher.flash(device, artifact, callbacks));
    }

    async flashFirmware (deviceId: string, firmwareId: string, callbacks?: StreamCallbacks): Promise<void> {
        const device = this.getDevice(deviceId);
        const {pack, file} = this.devices.getFirmwareImage(deviceId, firmwareId);
        return this.flashWithMonitorFreed(flasher => flasher.flashFirmware(device, pack, file, callbacks));
    }

    cancelUpload (): void {
        this.cancelInFlight();
    }

    cancelPlatformInstall (): void {
        this.cancelInFlight();
    }

    async getPlatformStatus (deviceId: string): Promise<PlatformStatus | null> {
        const device = this.getDevice(deviceId);
        return this.backend.builder.getPlatformStatus(device);
    }

    async installPlatform (deviceId: string, callbacks?: StreamCallbacks): Promise<void> {
        const device = this.getDevice(deviceId);
        return this.backend.builder.installPlatform(device, callbacks);
    }

    openMonitor (options: {baudRate: number}): Promise<void> {
        return this.backend.monitor.openMonitor(options);
    }

    closeMonitor (): Promise<void> {
        return this.backend.monitor.closeMonitor();
    }

    setMonitorBaud (rate: number): void {
        this.monitorBaud = rate;
        const {connection, monitor} = this.backend;
        if (connection.isConnected) {
            monitor.closeMonitor()
                .then(() => monitor.openMonitor({baudRate: rate}))
                .catch((err: Error) => log.warn(`setMonitorBaud: serial monitor did not reopen: ${err.message}`));
        }
    }

    private createBackend (mode: string): Backend {
        if (mode === 'cloud') return createCloudBackend(this.runtime);
        return createLocalBackend(this.runtime, {
            resourceBase: (globalThis as ResourceBaseGlobal).__THINGBLOCK_RESOURCE_BASE__ || null
        });
    }

    private getDevice (deviceId: string): LinkDevice {
        const device = this.devices.deviceRegistry.get(deviceId);
        if (!device) {
            throw new Error(`no device registered for "${deviceId}"`);
        }
        return device;
    }

    private async flashWithMonitorFreed (runFlash: (flasher: Flasher) => Promise<void>): Promise<void> {
        const {connection, flasher, monitor} = this.backend;
        await monitor.closeMonitor();
        try {
            await runFlash(flasher);
        } finally {
            if (connection.isConnected) {
                monitor.openMonitor({baudRate: this.monitorBaud})
                    .catch((err: Error) =>
                        log.warn(`flashWithMonitorFreed: serial monitor did not reopen: ${err.message}`));
            }
        }
    }

    private cancelInFlight (): void {
        const {builder, flasher} = this.backend;
        builder.cancel();
        flasher.cancel();
    }
}
