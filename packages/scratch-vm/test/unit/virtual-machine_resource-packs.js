const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine');

const test = tap.test;

// A stand-in for a helper-served device manifest (the shape thingblock-resource emits).
const sampleManifest = {
    id: 'thingbot',
    kind: 'device',
    name: 'ThingBot',
    fqbn: 'esp32:esp32:esp32c3',
    icon: './icon.svg',
    description: {id: 'device.thingbot.description', default: 'A ThingEdu ESP32-C3 board.'},
    manufacturer: 'thingedu.com',
    requires: 'serial',
    learnMore: 'https://thingedu.com',
    compile: {options: {CDCOnBoot: 'cdc'}},
    upload: {pnpid: ['USB\\VID_303A&PID_1001'], uploadSpeed: 921600}
};

test('getResourceOrigin derives the helper HTTP base in link mode, null otherwise', t => {
    const vm = new VirtualMachine();

    t.equal(
        vm.getResourceOrigin(),
        'http://localhost:3030/resources/extensions',
        'swaps ws->http and appends the resource path'
    );

    // The build server serves the same pack root it compiles against, so cloud mode has an origin too.
    vm.setLinkMode('cloud');
    t.equal(vm.getResourceOrigin(), 'http://localhost:8080/resources/extensions', 'the build server origin');

    t.end();
});

test('registerDeviceManifest exposes the pack device through getDeviceList', t => {
    const vm = new VirtualMachine();
    const base = 'http://localhost:3030/resources/extensions/devices/thingbot';

    vm.registerDeviceManifest(sampleManifest, base);

    const device = vm.getDeviceList().find(d => d.deviceId === 'thingbot');
    t.ok(device, 'the pack device joins the device list');
    t.equal(device.fqbn, 'esp32:esp32:esp32c3', 'carries the manifest FQBN');
    t.equal(device.iconURL, `${base}/icon.svg`, 'resolves the relative icon against the served base');
    t.equal(device.description, 'A ThingEdu ESP32-C3 board.', 'resolves the localized description');
    t.equal(device.manufacturer, 'thingedu.com', 'passes manufacturer through');
    t.equal(device.requires, 'serial', 'passes the connection requirement through');

    t.end();
});

test('registerDeviceManifest is idempotent on a duplicate id', t => {
    const vm = new VirtualMachine();
    const base = 'http://localhost:3030/resources/extensions/devices/thingbot';

    vm.registerDeviceManifest(sampleManifest, base);
    const count = vm.getDeviceList().filter(d => d.deviceId === 'thingbot').length;

    t.doesNotThrow(() => vm.registerDeviceManifest(sampleManifest, base), 'a repeat load does not throw');
    t.equal(vm.getDeviceList().filter(d => d.deviceId === 'thingbot').length, count, 'no duplicate device');
    t.equal(count, 1, 'registered exactly once');

    t.end();
});

test('ManifestDevice maps compile and upload config from the manifest', t => {
    const vm = new VirtualMachine();
    const base = 'http://localhost:3030/resources/extensions/devices/thingbot';

    vm.registerDeviceManifest(sampleManifest, base);
    const device = vm.deviceRegistry.get('thingbot');

    t.same(device.getCompileConfig(), {options: {CDCOnBoot: 'cdc'}}, 'compile options pass through');
    t.same(
        device.getUploadConfig(),
        {pnpid: ['USB\\VID_303A&PID_1001'], uploadSpeed: 921600},
        'upload config passes through'
    );

    t.end();
});

test('loadResourcePacks retries the index while the helper is still starting', async t => {
    const vm = new VirtualMachine();
    const realFetch = global.fetch;
    let attempts = 0;

    // The helper is a sidecar the desktop shell spawns, so the first fetches can beat it to its port.
    global.fetch = () => {
        attempts++;
        if (attempts < 3) return Promise.reject(new Error('ECONNREFUSED'));
        return Promise.resolve({json: () => Promise.resolve({packs: [{kind: 'device', path: 'devices/thingbot'}]})});
    };
    vm.setModuleImporter(() => Promise.resolve({default: sampleManifest}));

    try {
        await vm.loadResourcePacks();
    } finally {
        global.fetch = realFetch;
    }

    t.equal(attempts, 3, 'kept trying until the helper answered');
    t.ok(vm.getDeviceList().find(d => d.deviceId === 'thingbot'), 'the pack device joins the list after the retry');

    t.end();
});

test('loadResourcePacks gives up after a bounded number of attempts', async t => {
    const vm = new VirtualMachine();
    const realFetch = global.fetch;
    const realSetTimeout = global.setTimeout;
    let attempts = 0;
    const requestedDelaysMs = [];

    global.fetch = () => {
        attempts++;
        return Promise.reject(new Error('ECONNREFUSED'));
    };
    // Record the backoff the production code asks for without actually spending it — this test only
    // needs to see the bound, not wait it out.
    global.setTimeout = (fn, ms) => {
        requestedDelaysMs.push(ms);
        return realSetTimeout(fn, 0);
    };

    try {
        await vm.loadResourcePacks();
    } finally {
        global.fetch = realFetch;
        global.setTimeout = realSetTimeout;
    }

    t.equal(attempts, 14, 'stops after the bounded number of attempts');
    t.ok(requestedDelaysMs.reduce((total, ms) => total + ms, 0) > 47000,
        'the bounded window still covers the 47s worst case measured on real hardware');
    t.notOk(vm.getDeviceList().find(d => d.deviceId === 'thingbot'), 'no pack device registered');

    t.end();
});

test('loadResourcePacks does not latch after a failed run, so a later call still retries', async t => {
    const vm = new VirtualMachine();
    const realFetch = global.fetch;
    const realSetTimeout = global.setTimeout;
    let attempts = 0;
    const requestedDelaysMs = [];

    global.setTimeout = (fn, ms) => {
        requestedDelaysMs.push(ms);
        return realSetTimeout(fn, 0);
    };
    vm.setModuleImporter(() => Promise.resolve({default: sampleManifest}));

    try {
        // First call: the helper never answers, so this run exhausts its bounded attempts and gives up.
        global.fetch = () => {
            attempts++;
            return Promise.reject(new Error('ECONNREFUSED'));
        };
        await vm.loadResourcePacks();

        t.equal(attempts, 14, 'the first run gives up after the bounded number of attempts');
        t.notOk(vm.getDeviceList().find(d => d.deviceId === 'thingbot'), 'no pack device registered yet');

        // Second call: the helper now answers. If the failed run had set the loaded guard, this call
        // would short-circuit at the top of loadResourcePacks and never call fetch again.
        const attemptsAfterFirstRun = attempts;
        global.fetch = () => {
            attempts++;
            return Promise.resolve({
                json: () => Promise.resolve({packs: [{kind: 'device', path: 'devices/thingbot'}]})
            });
        };
        await vm.loadResourcePacks();

        t.ok(attempts > attemptsAfterFirstRun,
            'the second call actually re-fetched instead of short-circuiting on the guard');
        t.ok(vm.getDeviceList().find(d => d.deviceId === 'thingbot'),
            'the pack device from the second call is registered');
    } finally {
        global.fetch = realFetch;
        global.setTimeout = realSetTimeout;
    }

    t.end();
});

test('loadResourcePacks still gets the packs when the helper answers well past the old 2s window', async t => {
    const vm = new VirtualMachine();
    const realFetch = global.fetch;
    const realSetTimeout = global.setTimeout;
    let attempts = 0;
    const requestedDelaysMs = [];

    // Stand in for the wait itself: record what the retry loop asks to wait, but fire on the next
    // tick instead of really waiting. This is what keeps the test fast while still proving the
    // *bound* the production code computes, not a fake one built into the test.
    global.setTimeout = (fn, ms) => {
        requestedDelaysMs.push(ms);
        return realSetTimeout(fn, 0);
    };

    // Measured on real hardware, the helper has taken up to 47s to open its port (it starts an
    // arduino-cli daemon and probes a Bluetooth adapter before it serves). Answering only on the
    // 11th attempt means the retry loop must have already asked to wait more than 47s in total
    // before this attempt fires — well past the old 5-attempt/500ms-fixed window (~2s), under which
    // the helper would never have gotten this far: that code gave up for good after its 5th failure.
    global.fetch = () => {
        attempts++;
        if (attempts < 11) return Promise.reject(new Error('ECONNREFUSED'));
        return Promise.resolve({json: () => Promise.resolve({packs: [{kind: 'device', path: 'devices/thingbot'}]})});
    };
    vm.setModuleImporter(() => Promise.resolve({default: sampleManifest}));

    try {
        await vm.loadResourcePacks();
    } finally {
        global.fetch = realFetch;
        global.setTimeout = realSetTimeout;
    }

    const cumulativeDelayMs = requestedDelaysMs.reduce((total, ms) => total + ms, 0);

    t.equal(attempts, 11, 'kept retrying past the old window until the helper answered');
    t.ok(cumulativeDelayMs > 47000,
        `retry window before this attempt (${cumulativeDelayMs}ms) covers the 47s worst case measured ` +
        'on real hardware');
    t.ok(vm.getDeviceList().find(d => d.deviceId === 'thingbot'),
        'the pack device joins the list once the helper finally answers');

    t.end();
});

const firmwareManifest = Object.assign({}, sampleManifest, {
    firmware: [{
        id: 'telemetrix-ble',
        path: 'firmware/telemetrix-ble/telemetrix-ble.ino.bin',
        name: {id: 'device.thingbot.firmware.telemetrixBle', default: 'Live mode (Telemetrix over BLE)'}
    }]
});

test('getDeviceFirmware lists what the pack declared', t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(firmwareManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    const list = vm.getDeviceFirmware('thingbot');

    t.equal(list.length, 1, 'one image offered');
    t.equal(list[0].id, 'telemetrix-ble', 'carries the id');
    t.equal(list[0].name, 'Live mode (Telemetrix over BLE)', 'resolves the localized name');
    t.end();
});

test('getDeviceFirmware is empty for a device that declares none', t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(sampleManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    t.same(vm.getDeviceFirmware('thingbot'), [], 'no images, no menu entry');
    t.end();
});

test('flashDeviceFirmware sends flashFirmware with the pack-relative image', async t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(firmwareManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    // `LinkClient._request(type, payload, callbacks, cancellable)` is the single send path every
    // request goes through; `flash()` uses it too. Stubbing it keeps the test off the socket. The
    // flash is followed by a real `monitorOpen` reopen (the board stays connected), so this sees two
    // requests; the flashFirmware payload assertions below only care about the first.
    const sent = [];
    vm.client._request = (type, payload) => {
        sent.push({type, payload});
        return Promise.resolve({});
    };
    vm.client.isConnected = true;
    vm.client._connectedTarget = {id: '/dev/ttyUSB0'};

    await vm.flashDeviceFirmware('thingbot', 'telemetrix-ble');

    t.equal(sent[0].type, 'flashFirmware', 'uses the firmware request, not upload');
    t.equal(sent[0].payload.pack, 'extensions/devices/thingbot', 'pack is relative to the resource root');
    t.equal(sent[0].payload.file, 'firmware/telemetrix-ble/telemetrix-ble.ino.bin', 'names the app image');
    // sampleManifest declares compile.options {CDCOnBoot: 'cdc'}, which `_composeFqbn` (shared with
    // `flash()`) folds onto the base fqbn as arduino-cli board-menu selections.
    t.equal(sent[0].payload.fqbn, 'esp32:esp32:esp32c3:CDCOnBoot=cdc', 'carries the composed board fqbn');
    t.end();
});

test('flashDeviceFirmware closes the monitor before the flash and reopens it after', async t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(firmwareManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    // The board's one serial port can't be monitored while esptool drives it (confirmed on real
    // hardware: arduino-cli's serial-monitor holds the port and the flash fails with EBUSY), so
    // `flashDeviceFirmware` must free it first, same as `upload()`.
    const order = [];
    vm.client._request = type => {
        order.push(type);
        return Promise.resolve({});
    };
    vm.client.closeMonitor = () => {
        order.push('closeMonitor');
        return Promise.resolve();
    };
    vm.client.openMonitor = opts => {
        order.push(`openMonitor:${opts.baudRate}`);
        return Promise.resolve();
    };
    vm.client.isConnected = true;
    vm.client._connectedTarget = {id: '/dev/ttyUSB0'};

    await vm.flashDeviceFirmware('thingbot', 'telemetrix-ble');

    t.same(order, ['closeMonitor', 'flashFirmware', 'openMonitor:115200'],
        'frees the port for the flash, then restores the monitor at the stored baud, in that order');
    t.end();
});

test('flashDeviceFirmware reopens the monitor even when the flash rejects', async t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(firmwareManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    let reopened = false;
    vm.client._request = () => Promise.reject(new Error('flash failed'));
    vm.client.closeMonitor = () => Promise.resolve();
    vm.client.openMonitor = () => {
        reopened = true;
        return Promise.resolve();
    };
    vm.client.isConnected = true;
    vm.client._connectedTarget = {id: '/dev/ttyUSB0'};

    await t.rejects(
        vm.flashDeviceFirmware('thingbot', 'telemetrix-ble'),
        /flash failed/,
        'the flash rejection still surfaces'
    );
    t.equal(reopened, true, 'a failed restore does not leave the learner without a monitor');
    t.end();
});

test('flashDeviceFirmware does not fail the flash when the monitor fails to reopen', async t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(firmwareManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    let reopenAttempted = false;
    vm.client._request = () => Promise.resolve({});
    vm.client.closeMonitor = () => Promise.resolve();
    vm.client.openMonitor = () => {
        reopenAttempted = true;
        return Promise.reject(new Error('port busy'));
    };
    vm.client.isConnected = true;
    vm.client._connectedTarget = {id: '/dev/ttyUSB0'};

    await t.resolves(
        vm.flashDeviceFirmware('thingbot', 'telemetrix-ble'),
        'a reopen failure is swallowed to a warning, not turned into a flash failure'
    );
    t.equal(reopenAttempted, true, 'the reopen was actually attempted, not skipped');
    t.end();
});

test('flashDeviceFirmware rejects an unknown image id', async t => {
    const vm = new VirtualMachine();
    vm.registerDeviceManifest(firmwareManifest, 'http://localhost:3030/resources/extensions/devices/thingbot');

    await t.rejects(
        vm.flashDeviceFirmware('thingbot', 'no-such-image'),
        /no firmware "no-such-image"/,
        'names the missing id rather than failing silently'
    );
    t.end();
});
