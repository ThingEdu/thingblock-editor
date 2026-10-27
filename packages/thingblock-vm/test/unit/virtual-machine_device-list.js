const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine');

const test = tap.test;

test('getDeviceList includes VM-owned presentation data', t => {
    const vm = new VirtualMachine();
    const devices = vm.getDeviceList();

    t.ok(devices.length > 0, 'returns registered devices');
    for (const device of devices) {
        t.type(device.deviceId, 'string', 'includes a deviceId');
        t.type(device.fqbn, 'string', 'includes an FQBN');
        t.match(device.iconURL, /icon\.svg$/, `includes an icon for ${device.deviceId}`);
    }

    t.end();
});
