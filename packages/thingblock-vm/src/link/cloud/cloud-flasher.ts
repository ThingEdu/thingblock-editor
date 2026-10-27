import log from '../../util/log';
import {withDefaults} from '../callbacks';
import {DEFAULT_BAUD_RATE, type SerialPortLike} from './web-serial-link';
import type WebSerialLink from './web-serial-link';
import type {Artifact, Flasher, LinkDevice, SerialMonitor, StreamCallbacks} from '../types';

/**
 * Flash rate used when a device declares no `uploadSpeed`. esptool negotiates up to this after
 * connecting at the ROM's own rate.
 */
const DEFAULT_FLASH_BAUD = 921600;

/** The esptool-js surface the flasher drives; loose because esptool-js types a real `SerialPort`. */
export interface EsptoolModule {
    ESPLoader: new (options: object) => {
        main (): Promise<unknown>
        writeFlash (options: object): Promise<void>
        after (): Promise<void>
    }
    Transport: new (port: SerialPortLike, tracing?: boolean) => {
        disconnect (): Promise<void>
    }
}

/** An image to write, in esptool-js's `{data, address}` shape. */
interface FlashPart {
    data: string
    address: number
}

/**
 * The images to write, as esptool-js `{data, address}` entries. esptool-js takes binary strings,
 * which is exactly what `atob` yields from the server's base64. ESP targets only.
 * @param artifact - the compiled artifact.
 * @returns the images in flash order.
 */
const flashParts = (artifact: Artifact): FlashPart[] => {
    if (!artifact.parts || artifact.parts.length === 0) {
        // AVR ships a single Intel HEX with its addresses inline; flashing it needs STK500 over
        // Web Serial, which esptool-js cannot do.
        throw new Error('CloudClient.flash: web flashing supports ESP boards only; ' +
            'this build produced a single-image (AVR) artifact');
    }
    return artifact.parts.map(part => ({
        data: atob(part.data),
        address: part.offset
    }));
};

/**
 * Flashing ESP boards over the Web Serial port with esptool-js. Flashing is ESP-only; AVR needs
 * STK500 over Web Serial and throws for now.
 */
export default class CloudFlasher implements Flasher {
    private readonly link: WebSerialLink;
    private readonly monitor: SerialMonitor;
    private esptool: EsptoolModule | null;

    /**
     * @param link - the shared port holder esptool is handed the port from.
     * @param monitor - the monitor, closed first since esptool needs the port's streams unlocked.
     * @param esptool - esptool-js `{ESPLoader, Transport}` injected in tests; otherwise imported lazily.
     */
    constructor (link: WebSerialLink, monitor: SerialMonitor, esptool: EsptoolModule | null = null) {
        this.link = link;
        this.monitor = monitor;
        this.esptool = esptool;
    }

    /**
     * Flash a compiled artifact to the connected board with esptool-js, over the same Web Serial port.
     *
     * esptool drives the port itself (its own baud rates, DTR/RTS reset sequence), so the port is
     * handed over: monitor stopped, port closed, esptool run, then reopened at the monitor's rate.
     */
    async flash (device: LinkDevice, artifact: Artifact, callbacks?: StreamCallbacks): Promise<void> {
        const port = this.link.requirePort('flash');
        const {onLog, onProgress} = withDefaults(callbacks);
        const fileArray = flashParts(artifact);
        const {uploadSpeed = DEFAULT_FLASH_BAUD} = device.getUploadConfig();
        const {ESPLoader, Transport} = await this.loadEsptool();

        const total = fileArray.reduce((sum, {data}) => sum + data.length, 0);
        // Bytes in the images before the one being written, so progress climbs once across all four
        // rather than restarting per image.
        const offsets: number[] = [];
        fileArray.reduce((sum, {data}, index) => (offsets[index] = sum) + data.length, 0);

        log.info(`CloudClient.flash: writing ${fileArray.length} image(s), ${total} bytes at ${uploadSpeed} baud`);
        await this.monitor.closeMonitor();
        await port.close();

        const transport = new Transport(port, true);
        try {
            const loader = new ESPLoader({
                transport,
                baudrate: uploadSpeed,
                romBaudrate: DEFAULT_BAUD_RATE,
                terminal: {
                    clean: () => {},
                    write: (chunk: string) => onLog(chunk),
                    writeLine: (line: string) => onLog(`${line}\n`)
                }
            });
            await loader.main();
            await loader.writeFlash({
                fileArray,
                flashSize: 'keep',
                flashMode: 'keep',
                flashFreq: 'keep',
                eraseAll: false,
                compress: true,
                reportProgress: (index: number, written: number) => onProgress({
                    phase: `writing image ${index + 1}/${fileArray.length}`,
                    percent: ((offsets[index] + written) / total) * 100
                })
            });
            await loader.after();
            log.info('CloudClient.flash: flash complete');
        } finally {
            await transport.disconnect();
            // Hand the port back however the flash ended, so the monitor can reopen.
            await port.open({baudRate: this.link.baudRate});
        }
    }

    /**
     * Firmware restore needs a pack-shipped image file arduino-cli reads from a local resource root;
     * cloud mode compiles server-side and flashes over Web Serial with no such local image available.
     */
    get canFlashFirmware (): boolean {
        return false;
    }

    flashFirmware (): Promise<void> {
        throw new Error('CloudClient.flashFirmware: firmware restore is not available in cloud mode');
    }

    /** esptool-js offers no way to abort a flash in progress, so there is nothing to cancel. */
    cancel (): void {}

    /**
     * esptool-js is ESM with bundler-style imports, so it is loaded lazily: Node-based tests inject a
     * fake and never resolve it, and the browser bundle keeps it out of the main chunk.
     */
    private async loadEsptool (): Promise<EsptoolModule> {
        if (!this.esptool) {
            this.esptool = await import('esptool-js') as unknown as EsptoolModule;
        }
        return this.esptool;
    }
}
