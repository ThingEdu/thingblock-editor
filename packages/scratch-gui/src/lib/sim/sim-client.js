/**
 * The one simulator worker the editor runs. The Simulator panel drives it (load/run/step) and the
 * lesson panel watches it (rule verdicts); sharing the worker keeps both looking at the same program.
 */

/** The worker's chunk name; webpack.config.js keeps that chunk whole. */
const SIM_WORKER = 'sim-worker';

const defaultFactory = () => new Worker(
    /* webpackChunkName: "sim-worker" */ new URL('./sim.worker.js', import.meta.url),
    {name: SIM_WORKER}
);

let factory = defaultFactory;
let worker = null;
const listeners = new Set();

const ensureWorker = () => {
    if (worker) return worker;
    worker = factory();
    worker.onmessage = ({data}) => {
        for (const listener of [...listeners]) listener(data);
    };
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
    factory = next || defaultFactory;
    worker = null;
    listeners.clear();
};
