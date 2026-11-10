/**
 * Client of the ThingEdges Desktop local bridge: an HTTP server on 127.0.0.1 (first free port of
 * 47380..47389) that lists and controls the smart-home devices of the location open in ThingEdges Desktop.
 *
 * Someone must be signed in to ThingEdges Desktop with their own ThingEdges account. The bridge answers only
 * after an adult allows this app once in the Desktop window; the token it hands out is bound to that account
 * and kept in the given storage, so the child is not asked again while the same account is signed in.
 */

export const FIRST_PORT = 47380;
export const PORT_COUNT = 10;
const TOKEN_KEY = 'thingedges.bridgeToken';

export type DeviceKind = 'light' | 'switch' | 'plug' | 'curtain' | 'ac' | 'fan' | 'tv' | 'sensor' | 'button';
export type Capability = 'power' | 'brightness' | 'color' | 'ac_temperature' | 'ir' | 'sensor' | 'button';

export interface BridgeDevice {
    id: string
    name: string
    kind: DeviceKind
    room: string | null
    channels: {element: number, label: string}[]
    capabilities: Capability[]
    irKeys?: {key: string, label: string}[]
}

export interface DeviceState {
    /** Power per channel, keyed by element number. */
    on?: Record<string, boolean>
    brightness?: number
    acTemperature?: number
    temperature?: number
    humidity?: number
    lux?: number
    open?: boolean
}

export type Command =
    | {action: 'power', element?: number, on: boolean} |
    {action: 'toggle', element?: number} |
    {action: 'brightness', value: number} |
    {action: 'color', hue: number} |
    {action: 'ac_temperature', value: number} |
    {action: 'ir', key: string};

export interface KeyValueStore {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
    removeItem(key: string): void
}

export type FetchLike = (url: string, init?: {method?: string, headers?: Record<string, string>, body?: string}) =>
Promise<{status: number, json(): Promise<any>}>;

/** Raised when the bridge refuses a request; `status` is the HTTP status. */
export class BridgeError extends Error {
    status: number;

    constructor (status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export class BridgeClient {
    private readonly _fetch: FetchLike;
    private readonly _store: KeyValueStore | null;
    /** Base URL of the bridge once found, e.g. http://127.0.0.1:47380 */
    baseUrl: string | null = null;
    /** Whether an account is signed in to the Desktop, as of the last discovery. */
    signedIn = false;
    /** Account and location names; the bridge tells them only to a paired app. */
    account: string | null = null;
    location: string | null = null;

    constructor (fetchImpl: FetchLike, store: KeyValueStore | null) {
        this._fetch = fetchImpl;
        this._store = store;
    }

    get token (): string | null {
        try {
            return this._store?.getItem(TOKEN_KEY) ?? null;
        } catch {
            return null;
        }
    }

    private set token (value: string | null) {
        try {
            if (value) this._store?.setItem(TOKEN_KEY, value);
            else this._store?.removeItem(TOKEN_KEY);
        } catch {
            // Storage can be unavailable (private window); the adult is then asked again next time.
        }
    }

    // Finds the bridge on the fixed port range. Resolves to whether the stored token is still accepted,
    // or null when no bridge answers.
    async discover (): Promise<boolean | null> {
        for (let port = FIRST_PORT; port < FIRST_PORT + PORT_COUNT; port++) {
            const base = `http://127.0.0.1:${port}`;
            try {
                const response = await this._fetch(`${base}/v1/info`, {headers: this._headers()});
                if (response.status !== 200) continue;
                const info = await response.json();
                if (info?.name !== 'ThingEdges Desktop' || info?.api !== 1) continue;
                this.baseUrl = base;
                this.signedIn = info.signedIn === true;
                this.account = typeof info.account === 'string' ? info.account : null;
                this.location = typeof info.location === 'string' ? info.location : null;
                return info.paired === true;
            } catch {
                // Nothing listening on this port: try the next one.
            }
        }
        this.baseUrl = null;
        return null;
    }

    // Asks ThingEdges Desktop for access; resolves once the adult answers in the Desktop window.
    // Refused with 503 while nobody is signed in to the Desktop or no location is open.
    async pair (appName: string): Promise<void> {
        const reply = await this._request('POST', '/v1/pair', {app: appName}, false);
        if (typeof reply?.token !== 'string') throw new BridgeError(500, 'The bridge returned no token');
        this.token = reply.token;
    }

    forget (): void {
        this.token = null;
    }

    async devices (): Promise<BridgeDevice[]> {
        const reply = await this._request('GET', '/v1/devices');
        return Array.isArray(reply?.devices) ? reply.devices : [];
    }

    async states (): Promise<Record<string, DeviceState>> {
        const reply = await this._request('GET', '/v1/states');
        return reply?.states && typeof reply.states === 'object' ? reply.states : {};
    }

    async control (deviceId: string, command: Command): Promise<{ok: boolean, message: string}> {
        return this._request('POST', `/v1/devices/${encodeURIComponent(deviceId)}/control`, command);
    }

    private _headers (): Record<string, string> {
        const headers: Record<string, string> = {'Content-Type': 'application/json'};
        const token = this.token;
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    }

     
    private async _request (method: string, path: string, body?: unknown, auth = true): Promise<any> {
        if (!this.baseUrl) throw new BridgeError(0, 'ThingEdges Desktop is not running');
        const init: {method: string, headers: Record<string, string>, body?: string} = {
            method,
            headers: auth ? this._headers() : {'Content-Type': 'application/json'}
        };
        if (typeof body !== 'undefined') init.body = JSON.stringify(body);
        const response = await this._fetch(`${this.baseUrl}${path}`, init);
        const reply = await response.json().catch(() => null);
        if (response.status === 401) this.token = null;
        if (response.status !== 200) throw new BridgeError(response.status, reply?.error ?? `HTTP ${response.status}`);
        return reply;
    }
}
