const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine').default;

const test = tap.test;

test('getDeviceList includes VM-owned presentation data', t => {
    const vm = new VirtualMachine();
    const devices = vm.devices.getDeviceList();

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
    for (const retired of ['arduinoUno', 'arduinoNano', 'esp32']) {
        t.notOk(listed.includes(retired), `${retired} is not offered`);
    }
    t.ok(listed.includes('esp32c3'), 'ESP32-C3 is still offered');

    const all = vm.devices.getDeviceList({includeHidden: true}).map(device => device.deviceId);
    t.ok(all.includes('arduinoUno'), 'an old Uno project can still name its board');
    t.ok(vm.devices.deviceRegistry.get('arduinoUno'), 'the Uno device is still registered');
    t.end();
});
