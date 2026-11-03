/**
 * The one simulator worker the editor runs. The Simulator panel drives it (load/run/step) and the
 * lesson panel watches it (rule verdicts); sharing the worker keeps both looking at the same program.
 */
import {createSimWorker} from './sim-worker-factory';

/**
 * How long the worker may take to answer a command that always gets an answer (load, run, step) before
 * the client takes it for hung: a program stuck in a loop that never hands control back would otherwise
 * leave every later command unanswered, and Run would do nothing until the editor restarts.
 */
export const HUNG_MS = 3000;
/** Commands the worker answers at once: a snapshot, an error, or `idle` when nothing is loaded. */
const ANSWERED = new Set(['load', 'run', 'step']);

let factory = createSimWorker;
let worker = null;
let watchdog = null;
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

const disarm = () => {
    if (watchdog) clearTimeout(watchdog);
    watchdog = null;
};

// The worker did not answer in time: drop it, so the next command starts a fresh one, and tell the panels.
const hung = () => {
    watchdog = null;
    const stuck = worker;
    worker = null;
    if (stuck && stuck.terminate) stuck.terminate();
    dispatch({type: 'hung'});
};

const ensureWorker = () => {
    if (worker) return worker;
    const created = factory();
    created.onmessage = ({data}) => {
        if (worker === created) disarm();
        dispatch(data);
    };
    // A failed worker is dropped so the next post or subscribe starts a fresh one.
    created.onerror = event => {
        if (worker === created) {
            worker = null;
            disarm();
        }
        dispatch({type: 'error', message: event.message || String(event)});
    };
    worker = created;
    return worker;
};

const client = {
    post: command => {
        ensureWorker().postMessage(command);
        if (ANSWERED.has(command.type) && !watchdog) watchdog = setTimeout(hung, HUNG_MS);
    },
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
    disarm();
    listeners.clear();
};
