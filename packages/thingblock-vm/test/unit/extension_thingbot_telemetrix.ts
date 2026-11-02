import {test} from 'tap';
import {EventEmitter} from 'events';
import ThingBotTelemetrixExtension from '../../src/extensions/scratch3_thingbot_telemetrix/index.ts';
import ThingBotTelemetrix from '../../src/extensions/scratch3_thingbot_telemetrix/thingbot-telemetrix.ts';
import type {Transport} from '../../src/extensions/scratch3_thingbot_telemetrix/transport/transport.ts';
import {PeripheralEvent} from '../../src/event/event-name.ts';

const extensionSending = (sent: number[][]) => {
    const runtime = {events: new EventEmitter(), registerPeripheralExtension: () => {}};
    const ext = new ThingBotTelemetrixExtension(runtime);
    const transport = {send: (packet: Uint8Array) => sent.push([...packet])} as unknown as Transport;
    ext._telemetrix = new ThingBotTelemetrix(transport);
    return ext;
};

test('disconnect() emits PERIPHERAL_DISCONNECTED', t => {
    const runtime = {events: new EventEmitter(), registerPeripheralExtension: () => {}};
    const ext = new ThingBotTelemetrixExtension(runtime);
    ext._telemetrix = {disconnect: () => {}} as unknown as typeof ext._telemetrix;

    let emitted = false;
    runtime.events.on(PeripheralEvent.PERIPHERAL_DISCONNECTED, () => {
        emitted = true;
    });
    ext.disconnect();

    t.ok(emitted);
    t.end();
});

test('controlDC sends a negative speed as a signed byte so the motor reverses', t => {
    const sent: number[][] = [];
    const ext = extensionSending(sent);

    ext.controlDC({MOTOR_ID: '1', SPEED: -35});

    t.same(sent, [[3, 101, 1, 221]]);
    t.end();
});

test('controlDC clamps speed to -100..100', t => {
    const sent: number[][] = [];
    const ext = extensionSending(sent);

    ext.controlDC({MOTOR_ID: '2', SPEED: 200});
    ext.controlDC({MOTOR_ID: '2', SPEED: -200});

    t.same(sent, [[3, 101, 2, 100], [3, 101, 2, 156]]);
    t.end();
});
