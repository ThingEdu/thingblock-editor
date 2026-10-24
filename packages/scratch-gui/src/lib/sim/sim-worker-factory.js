/** The worker's chunk name; webpack.config.js keeps that chunk whole. */
const SIM_WORKER = 'sim-worker';

/**
 * @returns {Worker} A new simulator Web Worker.
 */
export const createSimWorker = () => new Worker(
    /* webpackChunkName: "sim-worker" */ new URL('./sim.worker.js', import.meta.url),
    {name: SIM_WORKER}
);
