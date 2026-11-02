import {test} from 'tap';
import {EventEmitter} from 'events';
import ThingBotTelemetrixExtension from '../../src/extensions/scratch3_thingbot_telemetrix/index.ts';
import ThingBotTelemetrix from '../../src/extensions/scratch3_thingbot_telemetrix/thingbot-telemetrix.ts';
import type {Transport} from '../../src/extensions/scratch3_thingbot_telemetrix/transport/transport.ts';
import {PeripheralEvent, RuntimeEvent} from '../../src/event/event-name.ts';

const extensionSending = (sent: number[][], {connected = true} = {}) => {
    const runtime = {events: new EventEmitter(), registerPeripheralExtension: () => {}};
    const ext = new ThingBotTelemetrixExtension(runtime);
    const transport = {
        send: (packet: Uint8Array) => sent.push([...packet]),
        isConnected: () => connected
    } as unknown as Transport;
    ext._telemetrix = new ThingBotTelemetrix(transport);
    return {ext, runtime};
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
    const {ext} = extensionSending(sent);

    ext.controlDC({MOTOR_ID: '1', SPEED: -35});

    t.same(sent, [[3, 101, 1, 221]]);
    t.end();
});

test('controlDC clamps speed to -100..100', t => {
    const sent: number[][] = [];
    const {ext} = extensionSending(sent);

    ext.controlDC({MOTOR_ID: '2', SPEED: 200});
    ext.controlDC({MOTOR_ID: '2', SPEED: -200});

    t.same(sent, [[3, 101, 2, 100], [3, 101, 2, 156]]);
    t.end();
});

test('stopping the project stops every motor and the buzzer', t => {
    const sent: number[][] = [];
    const {runtime} = extensionSending(sent);

    runtime.events.emit(RuntimeEvent.PROJECT_STOP_ALL);

    t.same(sent, [
        [3, 101, 1, 0],
        [3, 101, 2, 0],
        [3, 101, 3, 0],
        [3, 101, 4, 0],
        [2, 103, 0]
    ]);
    t.end();
});

test('stopping the project sends nothing while no ThingBot is connected', t => {
    const sent: number[][] = [];
    const {runtime} = extensionSending(sent, {connected: false});

    runtime.events.emit(RuntimeEvent.PROJECT_STOP_ALL);

    t.same(sent, []);
    t.end();
});

test('setPinMode sends the Arduino-ESP32 pin mode values the firmware switches on', t => {
    const sent: number[][] = [];
    const {ext} = extensionSending(sent);

    ext.setPinMode({PIN: '13', MODE: 'OUTPUT'});
    ext.setPinMode({PIN: '5', MODE: 'INPUT'});
    ext.setPinMode({PIN: '5', MODE: 'INPUT_PULLUP'});

    // esp32-hal-gpio.h: INPUT 0x01, OUTPUT 0x03, INPUT_PULLUP 0x05. Inputs also enable reporting.
    t.same(sent, [[3, 1, 13, 0x03], [4, 1, 5, 0x01, 1], [4, 1, 5, 0x05, 1]]);
    t.end();
});

test('setupUltrasonic defaults to TRIG 0 / ECHO 4, clear of the I2C and PS2 pins', t => {
    const sent: number[][] = [];
    const {ext} = extensionSending(sent);

    const block = ext.getInfo().blocks.find(b => typeof b === 'object' && b.opcode === 'setupUltrasonic');
    const args = (block as {arguments: Record<string, {defaultValue: unknown}>}).arguments;
    t.equal(args.TRIG.defaultValue, 0);
    t.equal(args.ECHO.defaultValue, 4);

    ext.setupUltrasonic({TRIG: args.TRIG.defaultValue as number, ECHO: args.ECHO.defaultValue as number});
    t.same(sent, [[4, 1, 0, 0x12, 4]]);
    t.end();
});
