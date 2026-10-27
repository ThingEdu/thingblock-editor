const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine');

const test = tap.test;

test('ESP32-C3 Dev Module registers and exposes its compile/upload config', t => {
    const vm = new VirtualMachine();

    t.ok(vm.deviceRegistry.deviceIds.includes('esp32c3'), 'esp32c3 is registered');

    const device = vm.deviceRegistry.get('esp32c3');
    t.equal(device.fqbn, 'esp32:esp32:esp32c3', 'uses the ESP32-C3 FQBN');
    t.same(
        device.getCompileConfig(),
        {options: {CDCOnBoot: 'cdc'}},
        'enables USB CDC on boot for the native USB Serial/JTAG'
    );

    const upload = device.getUploadConfig();
    t.ok(upload.pnpid.includes('USB\\VID_303A&PID_1001'), 'matches the native USB Serial/JTAG id');
    t.equal(upload.uploadSpeed, 921600, 'flashes at 921600 baud');

    t.end();
});
