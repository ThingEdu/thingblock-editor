const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine').default;
const flatBackend = require('../fixtures/flat-backend');

const test = tap.test;

test('listBoards rejects when no device is registered for the id', t => {
    const vm = new VirtualMachine();
    vm.link.listBoards('does-not-exist').then(
        () => t.fail('should reject for an unknown deviceId'),
        err => {
            t.match(err.message, /no device registered/);
            t.end();
        }
    );
});

test('connectBoard resolves the device and delegates it with the target to the link client', t => {
    const vm = new VirtualMachine();
    const fakeDevice = {getUploadConfig: () => ({pnpid: ['USB\\VID_2341&PID_0043']})};
    const target = {id: '/dev/ttyACM0', name: 'Arduino Uno'};
    vm.devices.deviceRegistry.get = deviceId => (deviceId === 'arduinoUno' ? fakeDevice : null);
    let received = null;
    vm.link.backend = flatBackend({
        connect: (device, t2) => {
            received = {device, target: t2};
            return Promise.resolve();
        },
        // connectBoard auto-opens the monitor after connecting; stub it so the chain resolves.
        openMonitor: () => Promise.resolve()
    });

    vm.link.connectBoard('arduinoUno', target).then(() => {
        t.equal(received.device, fakeDevice, 'passes the resolved device to the link client');
        t.equal(received.target, target, 'passes the target through to the link client');
        t.end();
    });
});

test('setLinkMode swaps the active client between the helper and cloud backends', t => {
    const vm = new VirtualMachine();
    const helper = vm.link.backend;

    vm.link.setLinkMode('cloud');
    const cloud = vm.link.backend;
    t.not(cloud, helper, 'cloud mode activates a different backend');

    vm.link.setLinkMode('cloud');
    t.equal(vm.link.backend, cloud, 'selecting the active mode again keeps the backend');

    vm.link.setLinkMode('link');
    t.not(vm.link.backend, cloud, 'link mode leaves the cloud backend');
    t.end();
});

test('setLinkMode disconnects the current client before switching', t => {
    const vm = new VirtualMachine();
    let disconnected = false;
    // The helper backend reads its connection from the session, so the switch sees an open link.
    vm.link.backend.session.connectedTarget = {id: '/dev/ttyACM0', name: 'Arduino Uno'};
    vm.link.backend.connection.disconnect = () => {
        disconnected = true;
        return Promise.resolve();
    };

    vm.link.setLinkMode('cloud');
    t.equal(disconnected, true, 'disconnects the previously active client');
    t.end();
});
