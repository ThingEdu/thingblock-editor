import {test} from 'tap';
import {EventEmitter} from 'events';
import ThingBotTelemetrixExtension from '../../src/extensions/scratch3_thingbot_telemetrix/index.ts';
import {RuntimeEventNames} from '../../src/engine/runtime/runtime-events.ts';

test('disconnect() emits PERIPHERAL_DISCONNECTED', t => {
    const runtime = {events: new EventEmitter(), registerPeripheralExtension: () => {}};
    const ext = new ThingBotTelemetrixExtension(runtime);
    ext._telemetrix = {disconnect: () => {}} as unknown as typeof ext._telemetrix;

    let emitted = false;
    runtime.events.on(RuntimeEventNames.PERIPHERAL_DISCONNECTED, () => {
        emitted = true;
    });
    ext.disconnect();

    t.ok(emitted);
    t.end();
});
