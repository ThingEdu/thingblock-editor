const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine').default;

const test = tap.test;

test('getDeviceList includes VM-owned presentation data', t => {
    const vm = new VirtualMachine();
    // Every built-in board is retired from the picker since 0.6 (ThingBot and VIA Banh Mi come from
    // resource packs), so look at the hidden ones too.
    const devices = vm.devices.getDeviceList({includeHidden: true});

    t.ok(devices.length > 0, 'returns registered devices');
    for (const device of devices) {
        t.type(device.deviceId, 'string', 'includes a deviceId');
        t.type(device.fqbn, 'string', 'includes an FQBN');
        t.match(device.iconURL, /icon\.svg$/, `includes an icon for ${device.deviceId}`);
    }

    t.end();
});

test('getDeviceList hides the boards retired from the picker but still knows them', t => {
    const vm = new VirtualMachine();
    const listed = vm.devices.getDeviceList().map(device => device.deviceId);
    for (const retired of ['arduinoUno', 'arduinoNano', 'esp32', 'esp32c3']) {
        t.notOk(listed.includes(retired), `${retired} is not offered`);
    }

    const all = vm.devices.getDeviceList({includeHidden: true}).map(device => device.deviceId);
    t.ok(all.includes('arduinoUno'), 'an old Uno project can still name its board');
    t.ok(all.includes('esp32c3'), 'an old ESP32-C3 project can still name its board');
    t.ok(vm.devices.deviceRegistry.get('esp32c3'), 'the ESP32-C3 device is still registered');
    t.ok(vm.devices.deviceRegistry.get('arduinoUno'), 'the Uno device is still registered');
    t.end();
});
