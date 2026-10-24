/**
 * The one simulator worker the editor runs. The Simulator panel drives it (load/run/step) and the
 * lesson panel watches it (rule verdicts); sharing the worker keeps both looking at the same program.
 */
import {createSimWorker} from './sim-worker-factory';

let factory = createSimWorker;
let worker = null;
const listeners = new Set();

// Every listener sees every message; the first listener error is rethrown once all have run.
const dispatch = message => {
    let failure = null;
    for (const listener of [...listeners]) {
        try {
            listener(message);
        } catch (error) {
            failure = failure || {error};
        }
    }
    if (failure) throw failure.error;
};

const ensureWorker = () => {
    if (worker) return worker;
    const created = factory();
    created.onmessage = ({data}) => dispatch(data);
    // A failed worker is dropped so the next post or subscribe starts a fresh one.
    created.onerror = event => {
        if (worker === created) worker = null;
        dispatch({type: 'error', message: event.message || String(event)});
    };
    worker = created;
    return worker;
};

const client = {
    post: command => ensureWorker().postMessage(command),
    subscribe: listener => {
        ensureWorker();
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
};

/**
 * @returns {{post: Function, subscribe: Function}} The client for the editor's shared simulator worker.
 */
export const getSimClient = () => client;

/**
 * Test seam: supply a worker factory; call with null to restore the default.
 * @param {?Function} next Returns a worker-like object, or null for the default factory.
 */
export const setWorkerFactory = next => {
    factory = next || createSimWorker;
    worker = null;
    listeners.clear();
};
