import log from '../../util/log';
import {withDefaults} from '../callbacks';
import {composeFqbn} from '../fqbn';
import type LinkSession from './link-session';
import type {Artifact, Flasher, LinkDevice, StreamCallbacks} from '../types';

/**
 * Firmware uploads through the helper, onto the port the connection selected. Both paths hand
 * arduino-cli's upload tool the board and port; they differ in where the image comes from.
 */
export default class LinkFlasher implements Flasher {
    private readonly session: LinkSession;

    constructor (session: LinkSession) {
        this.session = session;
    }

    /**
     * Flash a compiled artifact to the connected port via the helper's `upload`, streaming the upload
     * tool's output to `callbacks` until the helper replies. The artifact stays on the helper's disk —
     * its `path` (not bytes) is handed back to the helper, which points arduino-cli's `import_file` at
     * it. arduino-cli's upload tool prints its progress as text into the log stream, so an upload emits
     * `log` chunks (routed to `onLog`) and no structured `progress`.
     */
    async flash (device: LinkDevice, artifact: Artifact, callbacks?: StreamCallbacks): Promise<void> {
        const port = this.selectedPort('flash');
        const fqbn = composeFqbn(device);
        const {uploadSpeed = 0} = device.getUploadConfig();
        log.info(`LinkClient.flash: uploading ${artifact.format} artifact to ${port} for ${fqbn}`);
        await this.session.request(
            'upload',
            {fqbn, port, uploadSpeed, artifact},
            withDefaults(callbacks),
            true
        );
        log.info('LinkClient.flash: upload complete');
    }

    /** The helper implements `flashFirmware()`, so the GUI may offer a firmware install. */
    get canFlashFirmware (): boolean {
        return true;
    }

    /**
     * Flash a firmware image the device's pack ships, by resource-root-relative reference. The
     * counterpart to `flash()`, which uploads an artifact the helper just compiled; here nothing is
     * compiled and the helper resolves the image itself.
     * @param device - the selected device (supplies fqbn and upload config).
     * @param pack - pack directory under the resource root, e.g. `extensions/devices/thingbot`.
     * @param file - app image within the pack.
     */
    async flashFirmware (device: LinkDevice, pack: string, file: string, callbacks?: StreamCallbacks): Promise<void> {
        const port = this.selectedPort('flashFirmware');
        const fqbn = composeFqbn(device);
        const {uploadSpeed = 0} = device.getUploadConfig();
        log.info(`LinkClient.flashFirmware: flashing ${pack}/${file} to ${port} for ${fqbn}`);
        await this.session.request(
            'flashFirmware',
            {fqbn, port, uploadSpeed, pack, file},
            withDefaults(callbacks),
            true
        );
        log.info('LinkClient.flashFirmware: flash complete');
    }

    /** Abort the in-flight upload; see {@link LinkSession.cancel}. */
    cancel (): void {
        this.session.cancel();
    }

    /**
     * The selected port's id, throwing when none is: an upload without a port would only fail later,
     * inside the helper, with a less useful message.
     * @param operation - the calling method, named in the error.
     */
    private selectedPort (operation: string): string {
        if (!this.session.connectedTarget) {
            throw new Error(`LinkClient.${operation}: no connected port; call connect() first`);
        }
        return this.session.connectedTarget.id;
    }
}
