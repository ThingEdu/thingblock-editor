const test = require('tap').test;
const {createCloudBackend, filtersFromDevice, isCloudSupported} = require('../../src/link/cloud');
const Runtime = require('../../src/engine/runtime').default;

// A minimal fake of a Web Serial SerialPort that records open/close and serves scripted reads.
// `readable`/`writable` model Web Serial's stream locking, which the monitor has to release.
const makeFakePort = (chunks = []) => ({
    opened: false,
    openOptions: null,
    locked: false,
    written: [],
    open (options) {
        this.opened = true;
        this.openOptions = options;
        return Promise.resolve();
    },
    close () {
        if (this.locked) return Promise.reject(new Error('port busy: stream still locked'));
        this.opened = false;
        return Promise.resolve();
    },
    get readable () {
        const port = this;
        let index = 0;
        let cancelled = false;
        return {
            getReader () {
                port.locked = true;
                return {
                    read () {
                        if (cancelled || index >= chunks.length) {
                            // Park until cancelled, like a real idle port.
                            return cancelled ?
                                Promise.resolve({done: true}) :
                                new Promise(resolve => {
                                    port._unpark = () => resolve({done: true});
                                });
                        }
                        return Promise.resolve({done: false, value: new TextEncoder().encode(chunks[index++])});
                    },
                    cancel () {
                        cancelled = true;
                        if (port._unpark) port._unpark();
                        return Promise.resolve();
                    },
                    releaseLock () {
                        port.locked = false;
                    }
                };
            }
        };
    },
    get writable () {
        const port = this;
        return {
            getWriter: () => ({
                write (bytes) {
                    port.written.push(new TextDecoder().decode(bytes));
                    return Promise.resolve();
                },
                releaseLock () {}
            })
        };
    }
});

// Install a fake navigator.serial that hands back `port` and records the requestPort filters.
const installSerial = port => {
    const calls = {filters: null};
    global.navigator = {
        serial: {
            requestPort (options) {
                calls.filters = options.filters;
                return Promise.resolve(port);
            }
        }
    };
    return calls;
};

const uninstallSerial = () => {
    delete global.navigator;
};

test('spec', t => {
    const c = createCloudBackend(new Runtime());

    t.type(createCloudBackend, 'function');
    t.type(c.connection.listBoards, 'function');
    t.type(c.connection.connect, 'function');
    t.type(c.connection.disconnect, 'function');
    t.equal(c.connection.isConnected, false);
    t.end();
});

test('isSupported reflects navigator.serial presence', t => {
    uninstallSerial();
    t.equal(isCloudSupported(), false);

    installSerial(makeFakePort());
    t.equal(isCloudSupported(), true);
    uninstallSerial();
    t.end();
});

test('filtersFromDevice parses pnpid VID/PID', t => {
    const device = {
        getUploadConfig: () => ({
            pnpid: ['USB\\VID_2341&PID_0043', 'USB\\VID_2341&PID_0001', 'not-a-pnpid']
        })
    };
    t.same(filtersFromDevice(device), [
        {usbVendorId: 0x2341, usbProductId: 0x0043},
        {usbVendorId: 0x2341, usbProductId: 0x0001}
    ]);
    t.same(filtersFromDevice({getUploadConfig: () => ({})}), []);
    t.end();
});

const stubDevice = (name = 'Arduino Uno') => ({
    getUploadConfig: () => ({}),
    getDeviceInfo: () => ({name})
});

test('listBoards returns one picker entry labelled with the device when Web Serial is supported', t => {
    installSerial(makeFakePort());
    const c = createCloudBackend(new Runtime());
    c.connection.listBoards(stubDevice('Arduino Uno')).then(targets => {
        t.same(targets, [{id: 'web-serial', name: 'Arduino Uno'}]);
        uninstallSerial();
        t.end();
    });
});

test('listBoards is empty when Web Serial is unavailable', t => {
    uninstallSerial();
    const c = createCloudBackend(new Runtime());
    c.connection.listBoards(stubDevice()).then(targets => {
        t.same(targets, []);
        t.end();
    });
});

test('connect opens the port, exposes transport, and emits DEVICE_CONNECTED', t => {
    const rt = new Runtime();
    const c = createCloudBackend(rt);
    const port = makeFakePort();
    const calls = installSerial(port);

    let connectedEvents = 0;
    rt.events.on('DEVICE_CONNECTED', () => connectedEvents++);

    t.throws(() => c.connection.transport, 'transport throws before connect');

    c.connection.connect({filters: [{usbVendorId: 0x2341, usbProductId: 0x0043}]}).then(() => {
        t.equal(c.connection.isConnected, true);
        t.equal(port.opened, true);
        t.equal(port.openOptions.baudRate, 115200);
        t.equal(c.connection.transport, port);
        t.same(calls.filters, [{usbVendorId: 0x2341, usbProductId: 0x0043}]);
        t.equal(connectedEvents, 1);
        uninstallSerial();
        t.end();
    });
});

test('connect with no target shows all ports (empty filters)', t => {
    const c = createCloudBackend(new Runtime());
    const calls = installSerial(makeFakePort());

    c.connection.connect().then(() => {
        t.same(calls.filters, []);
        uninstallSerial();
        t.end();
    });
});

test('disconnect closes the port and emits DEVICE_DISCONNECTED', t => {
    const rt = new Runtime();
    const c = createCloudBackend(rt);
    const port = makeFakePort();
    installSerial(port);

    let disconnectedEvents = 0;
    rt.events.on('DEVICE_DISCONNECTED', () => disconnectedEvents++);

    c.connection.connect()
        .then(() => c.connection.disconnect())
        .then(() => {
            t.equal(c.connection.isConnected, false);
            t.equal(port.opened, false);
            t.throws(() => c.connection.transport);
            t.equal(disconnectedEvents, 1);
            uninstallSerial();
            t.end();
        });
});

test('disconnect is a no-op when not connected', t => {
    const rt = new Runtime();
    const c = createCloudBackend(rt);

    let disconnectedEvents = 0;
    rt.events.on('DEVICE_DISCONNECTED', () => disconnectedEvents++);

    c.connection.disconnect().then(() => {
        t.equal(disconnectedEvents, 0);
        t.end();
    });
});

test('connect throws when Web Serial is unavailable', t => {
    uninstallSerial();
    const c = createCloudBackend(new Runtime());
    c.connection.connect().then(
        () => {
            t.fail('expected connect to reject');
            t.end();
        },
        err => {
            t.match(err.message, /not available/);
            t.end();
        }
    );
});


test('platform management is gracefully unsupported (base Client defaults)', async t => {
    const c = createCloudBackend(new Runtime());
    t.equal(await c.builder.getPlatformStatus({}), null, 'no platform manager: status is null, not a throw');
    await t.rejects(c.builder.installPlatform({}), /does not support installPlatform/);
    t.end();
});

test('firmware restore is unsupported in cloud mode', async t => {
    const c = createCloudBackend(new Runtime());
    t.equal(c.flasher.canFlashFirmware, false, 'the GUI must not offer the restore item in cloud mode');
    await t.rejects(
        () => c.flasher.flashFirmware(
            {},
            'extensions/devices/thingbot',
            'firmware/telemetrix-ble/telemetrix-ble.ino.bin'
        ),
        /not available in cloud mode/,
        'flashFirmware fails with a clear, mode-specific message rather than a generic must-implement one'
    );
    t.end();
});

// A device stub supplying just what compile() reads.
const fakeDevice = (options = {}) => ({
    fqbn: 'esp32:esp32:esp32c3',
    getCompileConfig: () => ({options})
});

// A fetch stub whose response body streams `lines` as NDJSON, in arbitrary chunks.
const fetchStreaming = (lines, chunkSize = 7) => {
    const calls = {url: null, body: null};
    const text = lines.map(l => `${JSON.stringify(l)}\n`).join('');
    const bytes = new TextEncoder().encode(text);
    return [calls, (url, init) => {
        calls.url = url;
        calls.body = JSON.parse(init.body);
        let offset = 0;
        return Promise.resolve({
            ok: true,
            body: {
                getReader: () => ({
                    read: () => {
                        if (offset >= bytes.length) return Promise.resolve({done: true});
                        const value = bytes.slice(offset, offset + chunkSize);
                        offset += chunkSize;
                        return Promise.resolve({done: false, value});
                    }
                })
            }
        });
    }];
};

test('compile streams log/progress and resolves the artifact', async t => {
    const [calls, fetch] = fetchStreaming([
        {type: 'progress', payload: {phase: 'compiling', percent: 50}},
        {type: 'log', payload: {chunk: 'Sketch uses 1 byte\n'}},
        {type: 'result', payload: {artifact: {format: 'bin', data: 'QUJD'}}}
    ]);
    const c = createCloudBackend(new Runtime(), {url: 'http://build.test/', fetch});

    const logs = [];
    const progress = [];
    const artifact = await c.builder.compile(
        fakeDevice({CDCOnBoot: 'cdc'}),
        'void setup(){}',
        [{pack: 'dht', lib: 'src/DHT'}],
        {onLog: chunk => logs.push(chunk), onProgress: p => progress.push(p)}
    );

    t.equal(calls.url, 'http://build.test/compile', 'trailing slash is normalized away');
    t.equal(calls.body.fqbn, 'esp32:esp32:esp32c3:CDCOnBoot=cdc', 'board menu options fold into the fqbn');
    t.same(calls.body.libs, [{pack: 'dht', lib: 'src/DHT'}], 'lib refs travel, not lib bytes');
    t.same(logs, ['Sketch uses 1 byte\n']);
    t.same(progress, [{phase: 'compiling', percent: 50}]);
    t.same(artifact, {format: 'bin', data: 'QUJD'});
    t.equal(c.resourceOrigin, 'http://build.test/resources');
    t.end();
});

test('compile rejects on a terminal error frame', async t => {
    const [, fetch] = fetchStreaming([
        {type: 'log', payload: {chunk: 'error: expected ;\n'}},
        {type: 'error', payload: {code: 'grpc', message: 'compilation failed'}}
    ]);
    const c = createCloudBackend(new Runtime(), {fetch});
    await t.rejects(c.builder.compile(fakeDevice(), 'bad'), /compilation failed/);
    t.end();
});

test('compile rejects on a pre-stream HTTP error, using the server message', async t => {
    const fetch = () => Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({code: 'resource', message: 'lib nope/x is unreadable'})
    });
    const c = createCloudBackend(new Runtime(), {fetch});
    await t.rejects(c.builder.compile(fakeDevice(), 'x', [{pack: 'nope', lib: 'x'}]), /lib nope\/x is unreadable/);
    t.end();
});

test('compile rejects when the stream ends without an artifact', async t => {
    const [, fetch] = fetchStreaming([{type: 'log', payload: {chunk: 'nothing\n'}}]);
    const c = createCloudBackend(new Runtime(), {fetch});
    await t.rejects(c.builder.compile(fakeDevice(), 'x'), /without an artifact/);
    t.end();
});

test('cancel aborts the in-flight compile', async t => {
    let signal = null;
    const fetch = (url, init) => {
        signal = init.signal;
        return new Promise((resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        });
    };
    const c = createCloudBackend(new Runtime(), {fetch});

    const pending = c.builder.compile(fakeDevice(), 'x');
    c.builder.cancel();
    await t.rejects(pending, /aborted/);
    t.equal(signal.aborted, true);
    c.builder.cancel(); // no-op once settled
    t.end();
});

test('openMonitor emits inbound bytes as SERIAL_DATA and closeMonitor releases the lock', async t => {
    const rt = new Runtime();
    const c = createCloudBackend(rt);
    const port = makeFakePort(['hello ', 'board\n']);
    installSerial(port);

    const seen = [];
    rt.events.on('SERIAL_DATA', chunk => seen.push(chunk));

    await c.connection.connect();
    await c.monitor.openMonitor({baudRate: 115200});
    // Let the pump drain the scripted chunks.
    await new Promise(resolve => setTimeout(resolve, 10));

    t.same(seen, ['hello ', 'board\n'], 'each chunk is emitted as it arrives');
    t.equal(port.locked, true, 'the reader holds the readable lock while open');

    await c.monitor.closeMonitor();
    t.equal(port.locked, false, 'closeMonitor releases the lock');
    t.equal(port.opened, true, 'the port stays open');

    uninstallSerial();
    t.end();
});

test('openMonitor reopens the port when the baud rate differs', async t => {
    const c = createCloudBackend(new Runtime());
    const port = makeFakePort();
    installSerial(port);

    await c.connection.connect();
    t.equal(port.openOptions.baudRate, 115200);

    await c.monitor.openMonitor({baudRate: 9600});
    t.equal(port.openOptions.baudRate, 9600, 'reopened at the requested rate');

    await c.monitor.closeMonitor();
    uninstallSerial();
    t.end();
});

test('writeMonitor writes to the port and warns with no port', async t => {
    const c = createCloudBackend(new Runtime());
    const port = makeFakePort();
    installSerial(port);

    await c.connection.connect();
    c.monitor.writeMonitor('ping\n');
    await new Promise(resolve => setTimeout(resolve, 5));
    t.same(port.written, ['ping\n']);

    await c.connection.disconnect();
    c.monitor.writeMonitor('dropped'); // no port: warn-and-drop, not a throw
    t.same(port.written, ['ping\n']);

    uninstallSerial();
    t.end();
});

test('disconnect closes an open monitor first so the port can close', async t => {
    const c = createCloudBackend(new Runtime());
    const port = makeFakePort(['x']);
    installSerial(port);

    await c.connection.connect();
    await c.monitor.openMonitor({baudRate: 115200});
    t.equal(port.locked, true);

    await c.connection.disconnect();
    t.equal(port.locked, false, 'lock released');
    t.equal(port.opened, false, 'port actually closed');
    t.equal(c.connection.isConnected, false);

    uninstallSerial();
    t.end();
});

test('openMonitor throws when no port is connected', async t => {
    const c = createCloudBackend(new Runtime());
    await t.rejects(c.monitor.openMonitor({baudRate: 115200}), /no open port/);
    t.end();
});

// A fake esptool-js that records the port handoff and the images it was asked to write.
const fakeEsptool = (calls = {}) => {
    calls.events = [];
    return {
        Transport: class {
            constructor (port) {
                calls.transportPort = port;
                calls.events.push('transport');
                // Web Serial hands esptool a closed port; catching it here is the point of the test.
                calls.portOpenAtHandoff = port.opened;
            }
            disconnect () {
                calls.events.push('disconnect');
                return Promise.resolve();
            }
        },
        ESPLoader: class {
            constructor (options) {
                calls.options = options;
            }
            main () {
                calls.events.push('main');
                return Promise.resolve();
            }
            writeFlash (options) {
                calls.events.push('writeFlash');
                calls.writeFlash = options;
                // esptool reports bytes written within the current image.
                options.reportProgress(0, 2);
                options.reportProgress(3, options.fileArray[3].data.length);
                return Promise.resolve();
            }
            after () {
                calls.events.push('after');
                return Promise.resolve();
            }
        }
    };
};

const espArtifact = () => ({
    format: 'bin',
    parts: [
        {offset: 0x0, data: Buffer.from('boot').toString('base64')},
        {offset: 0x8000, data: Buffer.from('part').toString('base64')},
        {offset: 0xe000, data: Buffer.from('app0').toString('base64')},
        {offset: 0x10000, data: Buffer.from('application').toString('base64')}
    ]
});

const flashDevice = (uploadSpeed = 921600) => ({
    fqbn: 'esp32:esp32:esp32c3',
    getCompileConfig: () => ({options: {}}),
    getUploadConfig: () => ({uploadSpeed})
});

test('flash writes every image at its offset and hands the port over closed', async t => {
    const calls = {};
    const port = makeFakePort();
    installSerial(port);
    const c = createCloudBackend(new Runtime(), {esptool: fakeEsptool(calls)});

    await c.connection.connect();
    await c.monitor.openMonitor({baudRate: 115200});

    const progress = [];
    await c.flasher.flash(flashDevice(), espArtifact(), {onProgress: p => progress.push(p)});

    t.same(
        calls.writeFlash.fileArray.map(f => f.address),
        [0x0, 0x8000, 0xe000, 0x10000],
        'all four images, in flash order'
    );
    t.equal(calls.writeFlash.fileArray[3].data, 'application', 'base64 is decoded to a binary string');
    t.equal(calls.portOpenAtHandoff, false, 'the port is closed before esptool takes it');
    t.equal(calls.transportPort, port);
    t.equal(calls.options.baudrate, 921600, 'device uploadSpeed drives the flash rate');
    t.same(calls.events, ['transport', 'main', 'writeFlash', 'after', 'disconnect']);

    t.equal(port.locked, false, 'the monitor lock was released before the handoff');
    t.equal(port.opened, true, 'the port is reopened for the caller afterwards');
    t.equal(progress[progress.length - 1].percent, 100, 'progress spans all images, ending at 100');
    t.ok(progress[0].percent < 50, 'and starts low rather than restarting per image');

    uninstallSerial();
    t.end();
});

test('flash reopens the port even when esptool fails', async t => {
    const calls = {};
    const esptool = fakeEsptool(calls);
    esptool.ESPLoader.prototype.writeFlash = () => Promise.reject(new Error('flash write failed'));
    const port = makeFakePort();
    installSerial(port);
    const c = createCloudBackend(new Runtime(), {esptool});

    await c.connection.connect();
    await t.rejects(c.flasher.flash(flashDevice(), espArtifact()), /flash write failed/);
    t.equal(port.opened, true, 'the port is handed back so the monitor can reopen');

    uninstallSerial();
    t.end();
});

test('flash rejects an AVR single-image artifact with an actionable message', async t => {
    const port = makeFakePort();
    installSerial(port);
    const c = createCloudBackend(new Runtime(), {esptool: fakeEsptool({})});

    await c.connection.connect();
    await t.rejects(
        c.flasher.flash(flashDevice(), {format: 'hex', data: 'AAAA'}),
        /supports ESP boards only/
    );

    uninstallSerial();
    t.end();
});

test('flash throws when no port is connected', async t => {
    const c = createCloudBackend(new Runtime(), {esptool: fakeEsptool({})});
    await t.rejects(c.flasher.flash(flashDevice(), espArtifact()), /no open port/);
    t.end();
});
