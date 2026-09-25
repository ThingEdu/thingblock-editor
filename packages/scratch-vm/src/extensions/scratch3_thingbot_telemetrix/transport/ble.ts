import BleTransport from '../../../io/transport/ble';
import type {Report, ScanCallbacks, ScannedDevice, Transport} from './transport';

const SERVICE_UUID = 'aa700001-8f6a-4e2c-b369-4060e0bb33aa';
const RX_CHAR_UUID = 'aa700002-8f6a-4e2c-b369-4060e0bb33aa'; // browser → device
const TX_CHAR_UUID = 'aa700003-8f6a-4e2c-b369-4060e0bb33aa'; // device → browser (notify)

const CMD_ARE_YOU_THERE = 6;
const REPORT_I_AM_HERE = 6;
const HANDSHAKE_TIMEOUT = 5000;

type ReportHandler = (report: Report) => void;

class BLETransport implements Transport {
    _ble = new BleTransport();
    _connection = null;
    _rxChar = null;
    _reportHandlers: ReportHandler[] = [];
    _unsubscribeData: (() => void) | null = null;

    scan (callbacks: ScanCallbacks) {
        return this._ble.scan({services: [SERVICE_UUID]}, callbacks);
    }

    async connect (device: ScannedDevice, onDisconnect?: () => void) {
        this._connection = await this._ble.connect(device, () => {
            this._cleanup();
            if (onDisconnect) onDisconnect();
        });

        this._rxChar = await this._connection.getCharacteristic(SERVICE_UUID, RX_CHAR_UUID);
        const txChar = await this._connection.getCharacteristic(SERVICE_UUID, TX_CHAR_UUID);
        this._unsubscribeData = await txChar.subscribe((bytes: Uint8Array) => this._onData(bytes));

        await this._handshake();
    }

    send (packet: Uint8Array) {
        if (!this._rxChar) return;
        this._rxChar.write(packet).catch(() => {});
    }

    onReport (handler: ReportHandler) {
        this._reportHandlers.push(handler);
        return () => {
            this._reportHandlers = this._reportHandlers.filter(h => h !== handler);
        };
    }

    disconnect () {
        if (this._connection) {
            this._connection.disconnect();
        }
        this._cleanup();
    }

    isConnected () {
        return !!this._connection && this._connection.isConnected();
    }

    _handshake () {
        return new Promise<void>((resolve, reject) => {
            const ctx: {handler?: ReportHandler, timeout?: ReturnType<typeof setTimeout>} = {};

            ctx.handler = report => {
                if (report.id === REPORT_I_AM_HERE) {
                    clearTimeout(ctx.timeout);
                    this._reportHandlers = this._reportHandlers.filter(h => h !== ctx.handler);
                    resolve();
                }
            };

            ctx.timeout = setTimeout(() => {
                this._reportHandlers = this._reportHandlers.filter(h => h !== ctx.handler);
                reject(new Error('ThingBot handshake timeout'));
            }, HANDSHAKE_TIMEOUT);

            this._reportHandlers.push(ctx.handler);
            this.send(new Uint8Array([1, CMD_ARE_YOU_THERE]));
        });
    }

    // Deframe raw BLE bytes: [len, id, ...data]
    _onData (bytes: Uint8Array) {
        if (bytes.length < 2) return;
        const length = bytes[0];
        const id = bytes[1];
        const data: number[] = [];
        for (let i = 2; i < 1 + length; i++) {
            data.push(bytes[i]);
        }
        this._reportHandlers.forEach(h => h({id, data}));
    }

    _cleanup () {
        this._connection = null;
        this._rxChar = null;
        if (this._unsubscribeData) {
            this._unsubscribeData();
            this._unsubscribeData = null;
        }
    }
}

export default BLETransport;
