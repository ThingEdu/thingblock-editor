import {test} from 'tap';
import {EventEmitter} from 'events';
import Sensing from '../../src/blocks/scratch3_sensing.ts';
import type {RuntimeEvents} from '../../src/engine/runtime/runtime-events.ts';
import type BlockUtility from '../../src/engine/block-utility';
import type Target from '../../src/engine/target';

const utilFor = (target: object) => ({target} as unknown as BlockUtility);

test('getPrimitives', t => {
    const s = new Sensing(new EventEmitter<RuntimeEvents>());
    t.type(s.getPrimitives(), 'object');
    t.end();
});

test('ask and answer', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const s = new Sensing(events);

    events.on('QUESTION', question => {
        t.equal(question, 'a question');
        events.emit('ANSWER', 'the answer');
    });

    s.askAndWait({QUESTION: 'a question'}, utilFor({})).then(() => {
        t.equal(s.getAnswer(), 'the answer');
        t.end();
    });
});

test('ask and stop all dismisses question', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const s = new Sensing(events);
    const questions: Array<string | null> = [];
    events.on('QUESTION', question => questions.push(question));

    s.askAndWait({QUESTION: 'a question'}, utilFor({}));
    events.emit('PROJECT_STOP_ALL');

    t.strictSame(questions, ['a question', null]);
    t.end();
});

test('ask and stop for target dismisses its last question', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const s = new Sensing(events);
    const target = {} as Target;
    const questions: Array<string | null> = [];
    events.on('QUESTION', question => questions.push(question));

    s.askAndWait({QUESTION: 'a question'}, utilFor(target));
    events.emit('STOP_FOR_TARGET', target);

    t.strictSame(questions, ['a question', null]);
    t.end();
});

test('ask and stop for target asks the next question', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const s = new Sensing(events);
    const target = {} as Target;
    const questions: Array<string | null> = [];
    events.on('QUESTION', question => questions.push(question));

    s.askAndWait({QUESTION: 'a question'}, utilFor(target));
    s.askAndWait({QUESTION: 'a followup'}, utilFor({}));
    events.emit('STOP_FOR_TARGET', target);

    t.strictSame(questions, ['a question', 'a followup']);
    t.end();
});

test('answer gets reset when runtime is disposed', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const s = new Sensing(events);
    events.on('QUESTION', () => events.emit('ANSWER', 'the answer'));

    s.askAndWait({QUESTION: ''}, utilFor({})).then(() => {
        t.equal(s.getAnswer(), 'the answer');
        events.emit('RUNTIME_DISPOSED');
        t.equal(s.getAnswer(), '');
        t.end();
    });
});
