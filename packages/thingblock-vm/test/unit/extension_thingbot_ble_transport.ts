import {test} from 'tap';
import BLETransport from '../../src/extensions/scratch3_thingbot_telemetrix/transport/ble.ts';

test('a connect that fails after the BLE link opens disconnects it before rejecting', async t => {
    const transport = new BLETransport();
    let disconnected = false;
    const connection = {
        getCharacteristic: () => Promise.resolve({
            write: () => Promise.resolve(),
            subscribe: () => Promise.reject(new Error('subscribe failed'))
        }),
        disconnect: () => {
            disconnected = true;
        },
        isConnected: () => !disconnected
    };
    transport._ble = {connect: () => Promise.resolve(connection)} as unknown as typeof transport._ble;

    await t.rejects(transport.connect({id: 'd1'} as never), /subscribe failed/);
    t.ok(disconnected, 'the half-open BLE connection is closed');
    t.notOk(transport.isConnected(), 'the transport reports disconnected');
});
