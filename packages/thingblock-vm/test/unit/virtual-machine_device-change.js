const tap = require('tap');
const VirtualMachine = require('../../src/virtual-machine').default;
const flatBackend = require('../fixtures/flat-backend');

const test = tap.test;

/**
 * A VM whose `DEVICE_CHANGE` emits are counted.
 * @returns {{vm: VirtualMachine, changes: {count: number}}} the VM and its change counter.
 */
const makeVM = () => {
    const vm = new VirtualMachine();
    const changes = {count: 0};
    vm.events.on('DEVICE_CHANGE', () => changes.count++);
    return {vm, changes};
};

test('selectDevice emits DEVICE_CHANGE when the selection changes, including to null', async t => {
    const {vm, changes} = makeVM();

    await vm.devices.selectDevice(null);
    t.equal(changes.count, 0, 'null to null is not a change');

    await vm.devices.selectDevice('arduinoUno');
    t.equal(changes.count, 1, 'null to a device');

    await vm.devices.selectDevice('arduinoUno');
    t.equal(changes.count, 1, 'reselecting the same device is not a change');

    await vm.devices.selectDevice('esp32');
    t.equal(changes.count, 2, 'one device to another');

    await vm.devices.selectDevice(null);
    t.equal(changes.count, 3, 'a device to null');
});

test('applyBoard emits DEVICE_CHANGE only when the loaded board changes the selection', async t => {
    const {vm, changes} = makeVM();
    await vm.devices.selectDevice('arduinoUno');
    changes.count = 0;

    await vm.devices.applyBoard({device: 'arduinoUno', peripherals: []});
    t.equal(changes.count, 0, 'loading a project for the selected device is not a change');

    await vm.devices.applyBoard(null);
    t.equal(changes.count, 1, 'loading a project with no board clears the selection');
});

test('DEVICE_CHANGE disconnects a connected board', async t => {
    const {vm} = makeVM();
    let disconnects = 0;
    vm.link.backend = flatBackend({
        isConnected: true,
        disconnect: () => {
            disconnects++;
            return Promise.resolve();
        }
    });

    await vm.devices.selectDevice('arduinoUno');
    t.equal(disconnects, 1);
});
