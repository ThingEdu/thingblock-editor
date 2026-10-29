import log from '../../util/log';
import {withDefaults} from '../callbacks';
import {composeFqbn} from '../fqbn';
import type {LibRef} from '../../devices/peripheral-registry';
import type {Artifact, Builder, LinkDevice, PlatformStatus, Progress, StreamCallbacks} from '../types';

/** One newline-delimited JSON frame of the build server's response stream. */
interface Frame {
    type: string
    payload: {chunk?: string, artifact?: Artifact, message?: string} & Partial<Progress>
}

/**
 * Yield each newline-delimited JSON frame from a streamed response body.
 * @param body - the response body.
 */
const ndjson = async function* (body: ReadableStream<Uint8Array>): AsyncGenerator<Frame> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n');
        // The last element is whatever follows the final newline: a partial frame, or ''.
        buffer = lines.pop()!;
        for (const line of lines) {
            if (line) yield JSON.parse(line);
        }
    }
};

/**
 * The server's `{code, message}` error body, falling back to the status when it isn't JSON.
 * @param response - the failed response.
 * @returns the message to throw.
 */
const errorMessage = async (response: Response): Promise<string> => {
    try {
        const {message} = await response.json();
        if (message) return message;
    } catch {
        // Not a JSON error body (e.g. a proxy's HTML 502); fall through to the status.
    }
    return `CloudClient.compile: server returned ${response.status}`;
};

/**
 * Firmware builds on the cloud server (thingblock-link-cloud). The server owns the toolchain, so there
 * is no boards platform to manage here.
 */
export default class CloudBuilder implements Builder {
    private readonly url: string;
    private readonly fetch: typeof fetch;

    /** Aborts the in-flight compile; null when none is running. */
    private abort: AbortController | null = null;

    /**
     * @param url - the build server origin, without a trailing slash.
     * @param fetchImpl - the fetch function.
     */
    constructor (url: string, fetchImpl: typeof fetch) {
        this.url = url;
        this.fetch = fetchImpl;
    }

    /**
     * Build firmware on the cloud server, streaming `log`/`progress` to `callbacks` until the terminal
     * frame. The server has no shared filesystem with the browser, so the artifact carries base64
     * `parts` rather than a `path`. Vendored libs travel as `{pack, lib}` references the server
     * resolves from its own resource root — the same root it serves at `resourceOrigin`.
     */
    async compile (
        device: LinkDevice,
        source: string,
        libs: LibRef[] = [],
        callbacks?: StreamCallbacks
    ): Promise<Artifact> {
        const {onLog, onProgress} = withDefaults(callbacks);
        const fqbn = composeFqbn(device);
        log.info(`CloudClient.compile: requesting build for ${fqbn} with ${libs.length} vendored lib(s)`);

        this.abort = new AbortController();
        try {
            const response = await this.fetch(`${this.url}/compile`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({fqbn, options: {}, source, libs}),
                signal: this.abort.signal
            });
            // Failures caught before the stream opens (bad lib ref, malformed body) are plain HTTP
            // errors; everything after arrives as a terminal `error` frame instead.
            if (!response.ok) {
                throw new Error(await errorMessage(response));
            }

            let artifact: Artifact | null = null;
            for await (const frame of ndjson(response.body!)) {
                switch (frame.type) {
                case 'log': onLog(frame.payload.chunk!); break;
                case 'progress': onProgress(frame.payload as Progress); break;
                case 'result': artifact = frame.payload.artifact!; break;
                case 'error': throw new Error(frame.payload.message);
                }
            }
            if (!artifact) {
                throw new Error('CloudClient.compile: stream ended without an artifact');
            }
            log.info(`CloudClient.compile: artifact ready (format=${artifact.format})`);
            return artifact;
        } finally {
            this.abort = null;
        }
    }

    /**
     * Abort the in-flight compile. Dropping the response body is the whole protocol — the server
     * cancels the build when its stream goes away, so there is no cancel message to send.
     */
    cancel (): void {
        if (!this.abort) return;
        log.info('CloudClient.cancel: aborting the in-flight compile');
        this.abort.abort();
    }

    /** The server compiles against its own toolchains, so there is no platform status to report. */
    getPlatformStatus (): Promise<PlatformStatus | null> {
        return Promise.resolve(null);
    }

    installPlatform (): Promise<void> {
        return Promise.reject(new Error('CloudClient does not support installPlatform()'));
    }
}
