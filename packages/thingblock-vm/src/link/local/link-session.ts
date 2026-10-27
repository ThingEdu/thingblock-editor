import log from '../../util/log';
import {RuntimeEventNames} from '../../engine/runtime/runtime-events';
import type Runtime from '../../engine/runtime';
import type {ConnectionTarget, StreamCallbacks} from '../types';

/**
 * Default address of the native helper's WebSocket server (thingblock-link). The helper listens on
 * loopback, a secure context, so no TLS is needed.
 */
const DEFAULT_URL = 'ws://localhost:3030/';

/**
 * The WebSocket OPEN readyState (spec-fixed value, identical across implementations). Fire-and-forget
 * sends (`cancel`, `writeMonitor`) check it because `send()` throws while CONNECTING and silently
 * discards after OPEN — both better surfaced as an explicit warn-and-drop.
 */
const WS_OPEN = 1;

export interface LinkSessionOptions {
    /** The helper WebSocket URL (defaults to `ws://localhost:3030/`). */
    url?: string
    /** The WebSocket constructor (defaults to the global one). */
    WebSocket?: typeof WebSocket
    /** The fetch function for the helper's HTTP API (defaults to the global one). */
    fetch?: typeof fetch
    /** A host-supplied base URL for the resource packs, overriding the helper-served default. */
    resourceBase?: string | null
}

interface Pending {
    resolve: (value: never) => void
    reject: (error: Error) => void
    callbacks?: Required<StreamCallbacks> | null
}

/** The open monitor's routing; see {@link LinkSession.monitor}. */
interface MonitorRoute {
    id: string
    opened: boolean
}

type Outcome = {resolve: unknown} | {reject: Error};

/** The helper's `error` frame carries a machine-readable `code` beside the message. */
type HelperError = Error & {code?: string};

/**
 * The shared transport of the helper backend: one WebSocket to the native helper (thingblock-link)
 * and the protocol state every capability borrows. The helper is a translating proxy in front of the
 * arduino-cli daemon; this class speaks its minimal JSON envelope — `{id, type, payload}` — and never
 * sees an arduino-cli message type.
 *
 * One socket carries every operation. A request's `id` correlates it with its streamed responses
 * (`log` / `progress` / `monitorData`) and its single terminal reply (`result` or `error`).
 *
 * The selected port is helper-side session state — the helper records it on its own socket, with no
 * daemon round-trip — so a dropped socket means the helper has forgotten the port. The close handler
 * treats that as a disconnect to keep `connectedTarget` honest.
 *
 * The WebSocket and its URL are injectable so the VM's tests can drive a fake socket with no server.
 */
export default class LinkSession {
    readonly url: string;
    readonly resourceBase: string | null;
    readonly fetch: typeof fetch;

    /** The open target; null when disconnected. */
    connectedTarget: ConnectionTarget | null = null;

    /**
     * The open monitor session, or null when none. `monitorOpen` is the one request whose id keeps
     * receiving frames (`monitorData`, a late `error`) after its terminal `result`, so the routing
     * lives here rather than on the request's `pending` entry, which `settle` deletes on `result`.
     */
    monitor: MonitorRoute | null = null;

    private readonly runtime: Runtime;
    private readonly WebSocketImpl: typeof WebSocket;
    /** The live socket; null until first request opens it. */
    private ws: WebSocket | null = null;
    /** Memoized open handshake; null when the socket is closed. */
    private openPromise: Promise<void> | null = null;
    /** Monotonic request-id source. */
    private nextId = 1;
    /** In-flight requests by id. */
    private readonly pending = new Map<string, Pending>();
    /** Ids of in-flight cancellable requests (compile, upload, platform install). */
    private readonly cancellable = new Set<string>();

    constructor (runtime: Runtime, {
        url = DEFAULT_URL,
        WebSocket: WebSocketImpl = globalThis.WebSocket,
        fetch: fetchImpl = globalThis.fetch && globalThis.fetch.bind(globalThis),
        resourceBase = null
    }: LinkSessionOptions = {}) {
        this.runtime = runtime;
        this.url = url;
        this.WebSocketImpl = WebSocketImpl;
        this.fetch = fetchImpl;
        this.resourceBase = resourceBase;
    }

    /**
     * The helper's HTTP origin, derived from the WebSocket URL: the same helper process serves the WS
     * and its HTTP routes (`/resources`, `/api/...`) on one listener, so the origin is the WS origin
     * with the scheme swapped (ws→http / wss→https).
     */
    get httpOrigin (): string {
        return this.url.replace(/^ws/, 'http').replace(/\/$/, '');
    }

    /**
     * The base URL the resource packs are served from: the host's `resourceBase` when it supplied one,
     * otherwise the helper's own `/resources` static route.
     *
     * A host that ships the packs itself passes its own base so the editor never crosses origins to
     * read them — which the desktop shell does, because Chromium gates cross-address-space requests
     * into loopback and would otherwise block the pack fetches.
     */
    get resourceOrigin (): string {
        return this.resourceBase || `${this.httpOrigin}/resources`;
    }

    /** Whether the socket is open for a fire-and-forget send. */
    get isSocketOpen (): boolean {
        return this.ws !== null && this.ws.readyState === WS_OPEN;
    }

    /** Allocate a request id up front, for a request whose routing must be registered before it settles. */
    allocateId (): string {
        return String(this.nextId++);
    }

    /**
     * Send one request envelope and resolve with its terminal `result` payload (or reject on `error`).
     * Opens the socket on first use. When `callbacks` is given, streamed `log`/`progress` frames for
     * this request are routed to it until the terminal reply settles the promise.
     * @param type - the request type (e.g. 'listBoards').
     * @param payload - the request payload.
     * @param callbacks - streaming callbacks for this request, already defaulted via `withDefaults`;
     *   omitted for non-streaming requests.
     * @param cancellable - whether {@link cancel} may abort this request mid-flight (the long-running
     *   compile/upload); recorded so `cancel` can target its id.
     * @param id - a pre-allocated correlation id; defaults to a fresh one. `openMonitor` passes its own
     *   so it can register the monitor routing before the request settles.
     */
    request<T = Record<string, never>> (
        type: string,
        payload: object,
        callbacks?: Required<StreamCallbacks> | null,
        cancellable = false,
        id: string = this.allocateId()
    ): Promise<T> {
        const promise = new Promise<T>((resolve, reject) => {
            this.pending.set(id, {resolve, reject, callbacks});
        });
        if (cancellable) this.cancellable.add(id);
        this.ensureOpen()
            .then(() => this.ws!.send(JSON.stringify({id, type, payload})))
            .catch(err => this.settle(id, {reject: err}));
        return promise;
    }

    /**
     * Send a frame on an existing id with no reply expected. The caller checks {@link isSocketOpen}
     * first, so it can warn in its own words.
     */
    send (id: string, type: string, payload: object): void {
        this.ws!.send(JSON.stringify({id, type, payload}));
    }

    /**
     * Abort the in-flight cancellable request(s) — the running compile, upload or platform install.
     * Sends a `cancel` envelope stamped with the target request's id (per the protocol, `cancel`
     * carries the id of the request to drop, not a fresh one); the helper drops that request's stream
     * and replies on it with `error{cancelled}`, which rejects the original promise. A no-op when
     * nothing cancellable is in flight.
     *
     * Each id is cancelled once: a second call before the helper's reply finds the set already
     * drained, which lets the builder and the flasher both forward their `cancel()` here safely.
     */
    cancel (): void {
        if (this.cancellable.size === 0) return;
        if (!this.isSocketOpen) {
            // Nothing reached the helper yet (or the socket is going away), so there is nothing to
            // abort remotely; the pending request settles via the open failure or close path.
            log.warn(`LinkClient.cancel: socket not open; dropping cancel of ` +
                `request(s) ${[...this.cancellable].join(', ')}`);
            return;
        }
        for (const id of this.cancellable) {
            log.info(`LinkClient.cancel: requesting cancel of in-flight request ${id}`);
            this.send(id, 'cancel', {});
        }
        this.cancellable.clear();
    }

    /** Lazily open the socket, memoizing the handshake so concurrent requests share one connection. */
    private ensureOpen (): Promise<void> {
        if (this.openPromise) return this.openPromise;

        log.info(`LinkClient: opening WebSocket to the helper at ${this.url}`);
        this.openPromise = new Promise<void>((resolve, reject) => {
            const ws = new this.WebSocketImpl(this.url);
            this.ws = ws;
            ws.onopen = () => {
                log.info('LinkClient: WebSocket open');
                resolve();
            };
            ws.onmessage = event => this.handleMessage(event.data);
            ws.onerror = () => {
                // Surfaces as a rejected open to the first caller; later failures arrive via onclose.
                log.error(`LinkClient: WebSocket error connecting to ${this.url} — ` +
                    'is the thingblock-link helper running?');
                reject(new Error(`LinkClient: WebSocket error connecting to ${this.url}`));
            };
            ws.onclose = () => this.handleClose();
        });
        return this.openPromise;
    }

    /**
     * Route an inbound frame to its pending request. Terminal `result`/`error` settle the request;
     * streaming `log`/`progress` frames go to the request's callbacks without settling. `monitorData`
     * frames (which arrive on the open monitor's id past its terminal `result`) emit `SERIAL_DATA` on
     * the runtime; a late `error` on that id tears the monitor down. `event` frames are ignored.
     * @param raw - the JSON text frame.
     */
    private handleMessage (raw: string): void {
        let message;
        try {
            message = JSON.parse(raw);
        } catch (err) {
            log.error(`LinkClient: dropping unparseable frame: ${(err as Error).message}`, raw);
            return;
        }
        const {id, type, payload} = message;
        switch (type) {
        case 'log': {
            const pending = this.pending.get(id);
            if (pending && pending.callbacks) pending.callbacks.onLog(payload.chunk);
            break;
        }
        case 'progress': {
            const pending = this.pending.get(id);
            if (pending && pending.callbacks) pending.callbacks.onProgress(payload);
            break;
        }
        case 'result':
            // The monitor's open `result` confirms the port; later frames on this id are serial data.
            if (this.monitor && this.monitor.id === id) this.monitor.opened = true;
            this.settle(id, {resolve: payload});
            break;
        case 'monitorData':
            if (this.monitor && this.monitor.id === id) {
                this.runtime.events.emit(RuntimeEventNames.SERIAL_DATA, payload.data);
            }
            break;
        case 'error': {
            const error: HelperError = new Error((payload && payload.message) || 'link request failed');
            error.code = payload && payload.code;
            log.warn(`LinkClient: helper returned error for request ${id} ` +
                `(code=${error.code}): ${error.message}`);
            this.settle(id, {reject: error});
            // A post-open error means the serial port died; tear the monitor down. (Before open, the
            // rejected `openMonitor` promise already surfaces it — we just drop the stale routing.)
            if (this.monitor && this.monitor.id === id) {
                if (this.monitor.opened) {
                    log.warn(`LinkClient: serial monitor error, closing monitor: ${error.message}`);
                }
                this.monitor = null;
            }
            break;
        }
        default:
            break;
        }
    }

    /**
     * Reject every in-flight request when the socket closes, and reset so the next request reconnects.
     * The helper's selected port is session state on this socket, so a close also drops the link —
     * surface that as a disconnect.
     */
    private handleClose (): void {
        log.info(`LinkClient: WebSocket closed; rejecting ${this.pending.size} in-flight request(s)`);
        const err = new Error('LinkClient: connection to the helper closed');
        for (const id of [...this.pending.keys()]) {
            this.settle(id, {reject: err});
        }
        this.ws = null;
        this.openPromise = null;
        this.monitor = null;
        if (this.connectedTarget) {
            this.connectedTarget = null;
            this.runtime.events.emit(RuntimeEventNames.DEVICE_DISCONNECTED);
        }
    }

    /** Resolve or reject a pending request by id, then drop it. No-op if already settled. */
    private settle (id: string, outcome: Outcome): void {
        const pending = this.pending.get(id);
        if (!pending) return;
        this.pending.delete(id);
        this.cancellable.delete(id);
        if ('reject' in outcome) {
            pending.reject(outcome.reject);
        } else {
            pending.resolve(outcome.resolve as never);
        }
    }
}
