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
    // request goes through; `flash()` uses it too. Stubbing it keeps the test off the socket.
    const sent = [];
    vm.client._request = (type, payload) => {
        sent.push({type, payload});
        return Promise.resolve({});
    };
    vm.client.isConnected = true;
    vm.client._connectedTarget = {id: '/dev/ttyUSB0'};

    await vm.flashDeviceFirmware('thingbot', 'telemetrix-ble');

    t.equal(sent.length, 1, 'one request');
    t.equal(sent[0].type, 'flashFirmware', 'uses the firmware request, not upload');
    t.equal(sent[0].payload.pack, 'extensions/devices/thingbot', 'pack is relative to the resource root');
    t.equal(sent[0].payload.file, 'firmware/telemetrix-ble/telemetrix-ble.ino.bin', 'names the app image');
    // sampleManifest declares compile.options {CDCOnBoot: 'cdc'}, which `_composeFqbn` (shared with
    // `flash()`) folds onto the base fqbn as arduino-cli board-menu selections.
    t.equal(sent[0].payload.fqbn, 'esp32:esp32:esp32c3:CDCOnBoot=cdc', 'carries the composed board fqbn');
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
