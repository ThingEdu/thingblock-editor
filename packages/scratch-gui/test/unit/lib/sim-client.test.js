/* eslint-env jest */
import {getSimClient, setWorkerFactory} from '../../../src/lib/sim/sim-client';

class FakeWorker {
    constructor () {
        this.posted = [];
        this.onmessage = null;
        FakeWorker.instances.push(this);
    }
    postMessage (m) {
        this.posted.push(m);
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
});
