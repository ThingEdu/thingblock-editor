/* eslint-env jest */
jest.mock('../../../src/lib/sim/sim-worker-factory', () => ({
    createSimWorker: () => {
        throw new Error('not used in tests');
    }
}));

import {getSimClient, HUNG_MS, setWorkerFactory} from '../../../src/lib/sim/sim-client';

class FakeWorker {
    constructor () {
        this.posted = [];
        this.onmessage = null;
        FakeWorker.instances.push(this);
    }
    postMessage (m) {
        this.posted.push(m);
    }
    terminate () {
        this.terminated = true;
    }
}
FakeWorker.instances = [];

describe('sim client', () => {
    beforeEach(() => {
        FakeWorker.instances = [];
        setWorkerFactory(() => new FakeWorker());
    });
    afterEach(() => setWorkerFactory(null));

    test('creates one worker and fans messages out to every subscriber', () => {
        const a = getSimClient();
        const b = getSimClient();
        const seenA = [];
        const seenB = [];
        a.subscribe(m => seenA.push(m));
        const unsubB = b.subscribe(m => seenB.push(m));
        expect(FakeWorker.instances).toHaveLength(1);

        FakeWorker.instances[0].onmessage({data: {type: 'snapshot', snapshot: {t: 1}}});
        unsubB();
        FakeWorker.instances[0].onmessage({data: {type: 'check', results: []}});

        expect(seenA.map(m => m.type)).toEqual(['snapshot', 'check']);
        expect(seenB.map(m => m.type)).toEqual(['snapshot']);
    });

    test('posts commands to the shared worker', () => {
        getSimClient().post({type: 'run'});
        expect(FakeWorker.instances[0].posted).toEqual([{type: 'run'}]);
    });

    test('a worker failure reaches subscribers and the next post starts a fresh worker', () => {
        const factory = jest.fn(() => new FakeWorker());
        setWorkerFactory(factory);
        const seen = [];
        getSimClient().subscribe(m => seen.push(m));
        FakeWorker.instances[0].onerror({message: 'boom'});
        expect(seen).toEqual([{type: 'error', message: 'boom'}]);

        getSimClient().post({type: 'run'});
        expect(factory).toHaveBeenCalledTimes(2);
        expect(FakeWorker.instances[1].posted).toEqual([{type: 'run'}]);
    });

    test('a worker that stops answering is replaced, and subscribers hear it hung', () => {
        jest.useFakeTimers();
        try {
            const seen = [];
            getSimClient().subscribe(m => seen.push(m));
            getSimClient().post({type: 'load', code: 'c'});
            jest.advanceTimersByTime(HUNG_MS + 1);

            expect(FakeWorker.instances[0].terminated).toBe(true);
            expect(seen).toEqual([{type: 'hung'}]);
            getSimClient().post({type: 'load', code: 'c'});
            expect(FakeWorker.instances).toHaveLength(2);
            expect(FakeWorker.instances[1].posted).toEqual([{type: 'load', code: 'c'}]);
        } finally {
            jest.useRealTimers();
        }
    });

    test('any answer from the worker keeps it, and commands that need no answer never time out', () => {
        jest.useFakeTimers();
        try {
            const seen = [];
            getSimClient().subscribe(m => seen.push(m));
            getSimClient().post({type: 'speed', speed: 10});
            getSimClient().post({type: 'run'});
            FakeWorker.instances[0].onmessage({data: {type: 'snapshot', snapshot: {t: 0}}});
            jest.advanceTimersByTime(HUNG_MS * 3);

            expect(FakeWorker.instances[0].terminated).toBeUndefined();
            expect(seen.map(m => m.type)).toEqual(['snapshot']);
        } finally {
            jest.useRealTimers();
        }
    });

    test('a throwing listener does not starve later listeners', () => {
        const failure = new Error('listener failed');
        const seen = [];
        getSimClient().subscribe(() => {
            throw failure;
        });
        getSimClient().subscribe(m => seen.push(m));
        expect(() => FakeWorker.instances[0].onmessage({data: {type: 'snapshot'}})).toThrow(failure);
        expect(seen).toEqual([{type: 'snapshot'}]);
    });
});
