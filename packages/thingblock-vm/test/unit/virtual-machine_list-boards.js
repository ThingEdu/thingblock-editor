const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
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

test('listBoards resolves the device and delegates to the link client', t => {
    const vm = new VirtualMachine();
    const fakeDevice = {getUploadConfig: () => ({pnpid: ['USB\\VID_2341&PID_0043']})};
    const targets = [{id: '/dev/ttyACM0', name: 'Arduino Uno'}];

    vm.devices.deviceRegistry.get = deviceId => (deviceId === 'arduinoUno' ? fakeDevice : null);
    let receivedDevice = null;
    vm.link.backend = flatBackend({
        listBoards: device => {
            receivedDevice = device;
            return Promise.resolve(targets);
        }
    });

    vm.link.listBoards('arduinoUno').then(result => {
        t.equal(receivedDevice, fakeDevice, 'passes the resolved device to the link client');
        t.same(result, targets, 'returns the link client targets unchanged');
        t.end();
    });
});

test('connectBoard delegates the target to the link client', t => {
    const vm = new VirtualMachine();
    const target = {id: '/dev/ttyACM0', name: 'Arduino Uno'};
    let received = null;
    vm.link.backend = flatBackend({
        connect: t2 => {
            received = t2;
            return Promise.resolve();
        },
        // connectBoard auto-opens the monitor after connecting; stub it so the chain resolves.
        openMonitor: () => Promise.resolve()
    });

    vm.link.connectBoard(target).then(() => {
        t.equal(received, target, 'passes the target through to the link client');
        t.end();
    });
});

test('disconnectBoard delegates to the link client', t => {
    const vm = new VirtualMachine();
    let called = false;
    vm.link.backend = flatBackend({disconnect: () => {
        called = true;
        return Promise.resolve();
    }});

    vm.link.disconnectBoard().then(() => {
        t.equal(called, true, 'calls disconnect on the link client');
        t.end();
    });
});

test('upload rejects when no device is registered for the id', t => {
    const vm = new VirtualMachine();
    vm.link.upload('does-not-exist', {format: 'hex', path: '/p'}).then(
        () => t.fail('should reject for an unknown deviceId'),
        err => {
            t.match(err.message, /no device registered/);
            t.end();
        }
    );
});

test('upload resolves the device and delegates the artifact to the link client', t => {
    const vm = new VirtualMachine();
    const fakeDevice = {getUploadConfig: () => ({pnpid: [], uploadSpeed: 115200})};
    const artifact = {format: 'hex', path: '/tmp/a.hex'};
    const callbacks = {onLog: () => {}};

    vm.devices.deviceRegistry.get = deviceId => (deviceId === 'arduinoUno' ? fakeDevice : null);
    let received = null;
    vm.link.backend = flatBackend({
        flash: (device, art, cbs) => {
            received = {device, art, cbs};
            return Promise.resolve();
        },
        // upload frees the port around the flash; not connected here, so it never reopens.
        closeMonitor: () => Promise.resolve(),
        isConnected: false
    });

    vm.link.upload('arduinoUno', artifact, callbacks).then(() => {
        t.equal(received.device, fakeDevice, 'passes the resolved device to the link client');
        t.equal(received.art, artifact, 'passes the artifact through unchanged');
        t.equal(received.cbs, callbacks, 'passes the callbacks through');
        t.end();
    });
});

test('cancelUpload delegates to the link client', t => {
    const vm = new VirtualMachine();
    let called = false;
    vm.link.backend = flatBackend({cancel: () => {
        called = true;
    }});

    vm.link.cancelUpload();
    t.equal(called, true, 'calls cancel on the active client');
    t.end();
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
