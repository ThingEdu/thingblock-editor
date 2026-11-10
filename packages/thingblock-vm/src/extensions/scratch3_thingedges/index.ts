import ArgumentType from '../../extension-support/argument-type';
import BlockType from '../../extension-support/block-type';
import formatMessage from 'format-message';
import type {Extension, ExtensionInfo, MenuItem} from '../extension';
import {BridgeClient, BridgeError} from './bridge-client';
import type {BridgeDevice, Capability, Command, DeviceState, FetchLike, KeyValueStore} from './bridge-client';

/** A block argument as Scratch delivers it: a field's string, or a reporter's number. */
type ArgValue = string | number;

const EXTENSION_ID = 'thingEdges';
const APP_NAME = 'ThingBlock';
/** How often device states are read while the bridge is connected; "when" blocks react within this delay. */
const STATE_POLL_MS = 1000;
const DEVICE_REFRESH_MS = 30000;
const DISCOVERY_RETRY_MS = 5000;

// eslint-disable-next-line @stylistic/max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzVkNmVlNSIvPjxwYXRoIGQ9Ik0xMCAyMGwxMC05IDEwIDl2MTBhMiAyIDAgMCAxLTIgMkgxMmEyIDIgMCAwIDEtMi0yeiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjI0IiByPSIzIiBmaWxsPSIjZmZkNzRkIi8+PC9zdmc+';

// "id" for a whole device, "id#element" for one channel of a multi-channel switch.
const encodeTarget = (deviceId: string, element?: number): string =>
    (typeof element === 'number' ? `${deviceId}#${element}` : deviceId);

const decodeTarget = (value: ArgValue): {deviceId: string, element?: number} => {
    const [deviceId, element] = String(value).split('#');
    return typeof element === 'string' ? {deviceId, element: Number(element)} : {deviceId};
};

const clamp = (value: ArgValue, min: number, max: number): number => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : min;
};

const IR_KEYS: {key: string, text: string}[] = [
    {key: 'power', text: 'power'}, {key: 'power_on', text: 'on'}, {key: 'power_off', text: 'off'},
    {key: 'vol_up', text: 'volume up'}, {key: 'vol_down', text: 'volume down'}, {key: 'mute', text: 'mute'},
    {key: 'channel_up', text: 'next channel'}, {key: 'channel_down', text: 'previous channel'},
    {key: 'ok', text: 'OK'}, {key: 'up', text: 'up'}, {key: 'down', text: 'down'}, {key: 'left', text: 'left'},
    {key: 'right', text: 'right'}, {key: 'home', text: 'home'}, {key: 'back', text: 'back'},
    {key: 'play', text: 'play'}, {key: 'pause', text: 'pause'}, {key: 'fan_speed', text: 'fan speed'},
    {key: 'swing', text: 'swing'},
    ...Array.from({length: 10}, (_, n) => ({key: `num_${n}`, text: String(n)}))
];

/**
 * Smart-home devices of ThingEdges Desktop as blocks: lights, switches, outlets, air conditioners, TVs and
 * IR remotes of the location open in ThingEdges Desktop on the same computer, so children can program
 * the real house. The Desktop must be signed in to a personal ThingEdges account; access granted there
 * belongs to that account. Blocks run in the editor (host mode); nothing is compiled to a board.
 */
class ThingEdgesExtension implements Extension {
    runtime;
    _client: BridgeClient;
    _devices: BridgeDevice[] = [];
    _states: Record<string, DeviceState> = {};
    /**
     * 'searching' until a bridge answers, 'signedOut' while nobody is signed in to the Desktop, 'waiting' while
     * the signed-in account has not allowed this app yet.
     */
    _status: 'searching' | 'signedOut' | 'waiting' | 'connected' = 'searching';
    /** Bumped on every (re)connection so that polling loops of an earlier connection stop. */
    _session = 0;
    _timers: ReturnType<typeof setTimeout>[] = [];
    _disposed = false;
    _pairing: Promise<void> | null = null;

     
    constructor (runtime: any, options: {fetch?: FetchLike, store?: KeyValueStore | null, autoStart?: boolean} = {}) {
        this.runtime = runtime;
        const fetchImpl = options.fetch ?? (globalThis.fetch?.bind(globalThis) as unknown as FetchLike);
        const store = 'store' in options ? (options.store ?? null) : (globalThis.localStorage ?? null);
        this._client = new BridgeClient(fetchImpl, store);
        if (options.autoStart !== false) this._start();
    }

    // ─── Connection ───

    // Runs `task` after `ms` unless the extension was disposed in the meantime.
    _later (task: () => void, ms: number) {
        if (!this._disposed) this._timers.push(setTimeout(task, ms));
    }

    // Watches the Desktop until this app is paired with the signed-in account: it notices the Desktop starting,
    // someone signing in, and an account that allowed this app before signing back in.
    _start () {
        const session = this._session;
        const discover = async () => {
            if (session !== this._session || this._status === 'connected') return;
            const paired = await this._client.discover();
            // connect() may have paired while discovery was waiting for an answer.
            if (session !== this._session || this.isConnected()) return;
            if (paired) {
                await this._connected();
                return;
            }
            if (paired === null) this._status = 'searching';
            else this._status = this._client.signedIn ? 'waiting' : 'signedOut';
            this._later(discover, DISCOVERY_RETRY_MS);
        };
        discover();
    }

    async _connected () {
        if (this._status === 'connected') return;
        this._status = 'connected';
        const session = ++this._session;
        await this.refreshDevices();
        const poll = async () => {
            if (session !== this._session) return;
            await this.pollStates();
            this._later(poll, STATE_POLL_MS);
        };
        poll();
        const refresh = async () => {
            if (session !== this._session) return;
            await this.refreshDevices();
            this._later(refresh, DEVICE_REFRESH_MS);
        };
        this._later(refresh, DEVICE_REFRESH_MS);
    }

    // Stops polling; used by tests and when the extension is torn down.
    dispose () {
        this._disposed = true;
        for (const timer of this._timers) clearTimeout(timer);
        this._timers = [];
    }

    async refreshDevices () {
        try {
            this._devices = await this._client.devices();
        } catch (error) {
            this._lost(error);
        }
    }

    async pollStates () {
        try {
            this._states = await this._client.states();
        } catch (error) {
            this._lost(error);
        }
    }

    // A 401 means access was revoked or another account signed in; a 503 means the Desktop signed out.
    // Anything else is a transient failure.
    _lost (error: unknown) {
        if (!(error instanceof BridgeError) || (error.status !== 401 && error.status !== 503)) return;
        if (this._status !== 'connected') return;
        this._status = error.status === 401 ? 'waiting' : 'signedOut';
        this._devices = [];
        this._states = {};
        this._session++;
        this._start();
    }

    // Block: asks ThingEdges Desktop for access; the adult answers there.
    async connect () {
        if (this._status === 'connected') return;
        if (this._pairing) return this._pairing;
        this._pairing = (async () => {
            try {
                const paired = await this._client.discover();
                if (paired === null) return;
                if (paired) return await this._connected();
                if (!this._client.signedIn) {
                    this._status = 'signedOut';
                    console.warn('thingEdges.connect: sign in to ThingEdges Desktop with a ThingEdges account first');
                    return;
                }
                await this._client.pair(APP_NAME);
                await this._client.discover();
                await this._connected();
            } catch (error) {
                console.warn('thingEdges.connect: ThingEdges Desktop did not allow this app', error);
            } finally {
                this._pairing = null;
            }
        })();
        return this._pairing;
    }

    isConnected (): boolean {
        return this._status === 'connected';
    }

    // Block: tells the child what to do next, or which account and home the blocks control.
    status (): string {
        switch (this._status) {
        case 'connected': {
            const where = [this._client.account, this._client.location].filter(Boolean).join(' · ');
            return formatMessage({
                id: 'thingEdges.status.connected',
                default: 'connected: {where}',
                description: 'Status when the blocks control the devices; where is "account · location"'
            }, {where});
        }
        case 'waiting':
            return formatMessage({
                id: 'thingEdges.status.waiting',
                default: 'not allowed yet: use the connect block',
                description: 'Status when the signed-in account has not allowed ThingBlock yet'
            });
        case 'signedOut':
            return formatMessage({
                id: 'thingEdges.status.signedOut',
                default: 'sign in to ThingEdges Desktop with your account',
                description: 'Status when nobody is signed in to ThingEdges Desktop'
            });
        default:
            return formatMessage({
                id: 'thingEdges.status.searching',
                default: 'open ThingEdges Desktop on this computer',
                description: 'Status when ThingEdges Desktop is not running'
            });
        }
    }

    // ─── Menus (read from the cached device list, as menus must answer synchronously) ───

    _menu (capability: Capability, perChannel: boolean): MenuItem[] {
        const items: MenuItem[] = [];
        for (const device of this._devices) {
            if (!device.capabilities.includes(capability)) continue;
            const name = device.room ? `${device.name} (${device.room})` : device.name;
            if (perChannel && device.channels.length > 1) {
                for (const channel of device.channels) {
                    items.push({text: `${name} · ${channel.label}`, value: encodeTarget(device.id, channel.element)});
                }
            } else {
                items.push({text: name, value: encodeTarget(device.id)});
            }
        }
        if (items.length > 0) return items;
        const hint = this._status === 'connected' ?
            formatMessage({
                id: 'thingEdges.menu.noDevice',
                default: '(none)',
                description: 'Empty device menu'
            }) :
            formatMessage({
                id: 'thingEdges.menu.notConnected',
                default: '(not connected)',
                description: 'Device menu before the bridge is connected'
            });
        return [{text: hint, value: ''}];
    }

    powerMenu () {
        return this._menu('power', true);
    }

    lightMenu () {
        return this._menu('brightness', false);
    }

    acMenu () {
        return this._menu('ac_temperature', false);
    }

    remoteMenu () {
        return this._menu('ir', false);
    }

    sensorMenu () {
        return this._menu('sensor', false);
    }

    // ─── Blocks ───

    async _send (target: ArgValue, command: Command) {
        const {deviceId} = decodeTarget(target);
        if (!deviceId || this._status !== 'connected') return;
        try {
            await this._client.control(deviceId, command);
        } catch (error) {
            // A refused or rate-limited command must not stop the child's program.
            console.warn(`thingEdges: ${command.action} on ${deviceId} failed`, error);
        }
    }

    turn (args: {DEVICE: ArgValue, STATE: ArgValue}) {
        const {element} = decodeTarget(args.DEVICE);
        const on = args.STATE === 'on';
        const command: Command = typeof element === 'number' ? {action: 'power', on, element} : {action: 'power', on};
        return this._send(args.DEVICE, command);
    }

    toggle (args: {DEVICE: ArgValue}) {
        const {element} = decodeTarget(args.DEVICE);
        return this._send(args.DEVICE, typeof element === 'number' ? {action: 'toggle', element} : {action: 'toggle'});
    }

    setBrightness (args: {LIGHT: ArgValue, VALUE: ArgValue}) {
        return this._send(args.LIGHT, {action: 'brightness', value: clamp(args.VALUE, 0, 100)});
    }

    setColor (args: {LIGHT: ArgValue, HUE: ArgValue}) {
        return this._send(args.LIGHT, {action: 'color', hue: clamp(args.HUE, 0, 360)});
    }

    setAcTemperature (args: {AC: ArgValue, VALUE: ArgValue}) {
        return this._send(args.AC, {action: 'ac_temperature', value: clamp(args.VALUE, 18, 30)});
    }

    pressRemote (args: {KEY: ArgValue, REMOTE: ArgValue}) {
        return this._send(args.REMOTE, {action: 'ir', key: String(args.KEY)});
    }

    isOn (args: {DEVICE: ArgValue}): boolean {
        const {deviceId, element} = decodeTarget(args.DEVICE);
        const on = this._states[deviceId]?.on;
        if (!on) return false;
        if (typeof element === 'number') return on[String(element)] === true;
        return Object.values(on).some(Boolean);
    }

    whenTurned (args: {DEVICE: ArgValue, STATE: ArgValue}): boolean {
        const {deviceId} = decodeTarget(args.DEVICE);
        if (!this._states[deviceId]?.on) return false;
        return this.isOn(args) === (args.STATE === 'on');
    }

    sensorValue (args: {SENSOR: ArgValue, MEASURE: ArgValue}): number {
        const state = this._states[decodeTarget(args.SENSOR).deviceId];
        const value = state?.[String(args.MEASURE) as 'temperature' | 'humidity' | 'lux'];
        return typeof value === 'number' ? value : 0;
    }

    whenSensorAbove (args: {SENSOR: ArgValue, MEASURE: ArgValue, VALUE: ArgValue}): boolean {
        const state = this._states[decodeTarget(args.SENSOR).deviceId];
        const value = state?.[String(args.MEASURE) as 'temperature' | 'humidity' | 'lux'];
        return typeof value === 'number' && value > Number(args.VALUE);
    }

    // ─── Extension metadata ───

    getInfo (): ExtensionInfo {
        const onOff = {
            acceptReporters: false,
            items: [
                {text: formatMessage({id: 'thingEdges.state.on', default: 'on', description: 'Power on'}), value: 'on'},
                {text: formatMessage({
                    id: 'thingEdges.state.off',
                    default: 'off',
                    description: 'Power off'
                }),
                value: 'off'}
            ]
        };
        return {
            id: EXTENSION_ID,
            name: formatMessage({
                id: 'thingEdges.name',
                default: 'Smart home',
                description: 'Name of the ThingEdges extension'
            }),
            blockIconURI,
            color1: '#5d6ee5',
            color2: '#4a5bd1',
            color3: '#3b49b0',
            blocks: [
                {
                    opcode: 'connect',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'thingEdges.connect',
                        default: 'connect to ThingEdges Desktop',
                        description: 'Ask ThingEdges Desktop for access to the devices'
                    })
                },
                {
                    opcode: 'status',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'thingEdges.statusBlock',
                        default: 'ThingEdges status',
                        description: 'Reporter telling whether the blocks reach ThingEdges Desktop'
                    })
                },
                '---',
                {
                    opcode: 'turn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'thingEdges.turn',
                        default: 'turn [DEVICE] [STATE]',
                        description: 'Turn a device on or off'
                    }),
                    arguments: {
                        DEVICE: {type: ArgumentType.STRING, menu: 'powerDevices'},
                        STATE: {type: ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}
                    }
                },
                {
                    opcode: 'toggle',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'thingEdges.toggle',
                        default: 'toggle [DEVICE]',
                        description: 'Switch a device to its other state'
                    }),
                    arguments: {DEVICE: {type: ArgumentType.STRING, menu: 'powerDevices'}}
                },
                {
                    opcode: 'setBrightness',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'thingEdges.setBrightness',
                        default: 'set brightness of [LIGHT] to [VALUE] %',
                        description: 'Dim a light'
                    }),
                    arguments: {
                        LIGHT: {type: ArgumentType.STRING, menu: 'lights'},
                        VALUE: {type: ArgumentType.NUMBER, defaultValue: 50}
                    }
                },
                {
                    opcode: 'setColor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'thingEdges.setColor',
                        default: 'set color of [LIGHT] to [HUE]',
                        description: 'Color a light'
                    }),
                    arguments: {
                        LIGHT: {type: ArgumentType.STRING, menu: 'lights'},
                        HUE: {type: ArgumentType.NUMBER, defaultValue: 120}
                    }
                },
                {
                    opcode: 'setAcTemperature',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'thingEdges.setAcTemperature',
                        default: 'set [AC] to [VALUE] °C',
                        description: 'Set an air conditioner temperature'
                    }),
                    arguments: {
                        AC: {type: ArgumentType.STRING, menu: 'acs'},
                        VALUE: {type: ArgumentType.NUMBER, defaultValue: 26}
                    }
                },
                {
                    opcode: 'pressRemote',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'thingEdges.pressRemote',
                        default: 'press [KEY] on remote [REMOTE]',
                        description: 'Send an infrared key'
                    }),
                    arguments: {
                        KEY: {type: ArgumentType.STRING, menu: 'irKeys', defaultValue: 'power'},
                        REMOTE: {type: ArgumentType.STRING, menu: 'remotes'}
                    }
                },
                '---',
                {
                    opcode: 'isOn',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'thingEdges.isOn',
                        default: '[DEVICE] is on?',
                        description: 'Whether a device is on'
                    }),
                    arguments: {DEVICE: {type: ArgumentType.STRING, menu: 'powerDevices'}}
                },
                {
                    opcode: 'sensorValue',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'thingEdges.sensorValue',
                        default: '[MEASURE] of [SENSOR]',
                        description: 'A sensor reading'
                    }),
                    arguments: {
                        MEASURE: {type: ArgumentType.STRING, menu: 'measures', defaultValue: 'temperature'},
                        SENSOR: {type: ArgumentType.STRING, menu: 'sensors'}
                    }
                },
                '---',
                {
                    opcode: 'whenTurned',
                    blockType: BlockType.HAT,
                    isEdgeActivated: true,
                    text: formatMessage({
                        id: 'thingEdges.whenTurned',
                        default: 'when [DEVICE] turns [STATE]',
                        description: 'Device changed'
                    }),
                    arguments: {
                        DEVICE: {type: ArgumentType.STRING, menu: 'powerDevices'},
                        STATE: {type: ArgumentType.STRING, menu: 'onOff', defaultValue: 'on'}
                    }
                },
                {
                    opcode: 'whenSensorAbove',
                    blockType: BlockType.HAT,
                    isEdgeActivated: true,
                    text: formatMessage({
                        id: 'thingEdges.whenSensorAbove',
                        default: 'when [MEASURE] of [SENSOR] > [VALUE]',
                        description: 'Sensor reading went above a value'
                    }),
                    arguments: {
                        MEASURE: {type: ArgumentType.STRING, menu: 'measures', defaultValue: 'temperature'},
                        SENSOR: {type: ArgumentType.STRING, menu: 'sensors'},
                        VALUE: {type: ArgumentType.NUMBER, defaultValue: 30}
                    }
                }
            ],
            menus: {
                powerDevices: {acceptReporters: false, items: 'powerMenu'},
                lights: {acceptReporters: false, items: 'lightMenu'},
                acs: {acceptReporters: false, items: 'acMenu'},
                remotes: {acceptReporters: false, items: 'remoteMenu'},
                sensors: {acceptReporters: false, items: 'sensorMenu'},
                onOff,
                irKeys: {
                    acceptReporters: false,
                    items: IR_KEYS.map(({key, text}) => ({
                        text: formatMessage({id: `thingEdges.ir.${key}`, default: text, description: 'Remote key'}),
                        value: key
                    }))
                },
                measures: {
                    acceptReporters: false,
                    items: [
                        {text: formatMessage({
                            id: 'thingEdges.measure.temperature',
                            default: 'temperature',
                            description: 'Sensor'
                        }),
                        value: 'temperature'},
                        {text: formatMessage({
                            id: 'thingEdges.measure.humidity',
                            default: 'humidity',
                            description: 'Sensor'
                        }),
                        value: 'humidity'},
                        {text: formatMessage({
                            id: 'thingEdges.measure.lux',
                            default: 'light level',
                            description: 'Sensor'
                        }),
                        value: 'lux'}
                    ]
                }
            }
        };
    }
}

export default ThingEdgesExtension;
