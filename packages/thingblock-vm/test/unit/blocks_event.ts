import {test} from 'tap';
import Event from '../../src/blocks/scratch3_event.ts';
import type {HatMatchFields} from '../../src/engine/runtime.ts';
import {EventBus} from '../../src/event/event-bus.ts';

test('getHats', t => {
    const e = new Event(new EventBus(), {startHats: () => []});
    t.strictSame(e.getHats().event_whenkeypressed, {restartExistingThreads: false});
    t.strictSame(e.getHats().event_whenflagclicked, {restartExistingThreads: true});
    t.end();
});

test('key press starts the key hats and the "any" hats', t => {
    const events = new EventBus();
    const started: Array<[string, HatMatchFields | undefined]> = [];
    const e = new Event(events, {
        startHats: (opcode, fields) => {
            started.push([opcode, fields]);
            return [];
        }
    });

    events.emit('KEY_PRESSED', 'A');
    t.ok(e);
    t.strictSame(started, [
        ['event_whenkeypressed', {KEY_OPTION: 'A'}],
        ['event_whenkeypressed', {KEY_OPTION: 'any'}]
    ]);
    t.end();
});
