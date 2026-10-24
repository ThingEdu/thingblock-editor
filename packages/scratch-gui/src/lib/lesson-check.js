/** How much virtual time a run gets to satisfy a step's rules before the verdict is "not yet" (spec §6). */
export const CHECK_WINDOW_US = 5000000;

/**
 * Turn the worker's latest verdict and snapshot into what the lesson panel shows. Precedence: blocks the
 * simulator cannot run (`blocked`), a runtime error (`error`), no run since the last edit or no verdict yet
 * (`waiting`), a step without rules (`idle`), every rule holds (`passed`), a miss while the window is open
 * (`waiting`), a miss after the window closed or the program halted (`failed`).
 * The worker posts a `check` only when the verdict changes, so `report.t` is when it last changed; the
 * window is measured on the later of that and the latest snapshot.
 * @param {object} args
 * @param {?{results: {ok: boolean, message: string}[], t: number}} args.report Latest `check` message.
 * @param {?{phase: string, t: number, error?: string}} args.snapshot Latest simulator snapshot.
 * @param {{message: string}[]} args.diagnostics Blocks the simulator cannot run.
 * @param {boolean} args.ranSinceEdit Whether Run was pressed after the last block edit.
 * @returns {{status: string, messages: string[]}} The verdict box state.
 */
export const decideCheck = ({report, snapshot, diagnostics, ranSinceEdit}) => {
    if (diagnostics.length) return {status: 'blocked', messages: diagnostics.map(d => d.message)};
    if (snapshot && snapshot.error) return {status: 'error', messages: [snapshot.error]};
    if (!ranSinceEdit || !report) return {status: 'waiting', messages: []};
    if (report.results.length === 0) return {status: 'idle', messages: []};
    if (report.results.every(r => r.ok)) return {status: 'passed', messages: []};
    const t = Math.max(report.t, snapshot ? snapshot.t : 0);
    const windowClosed = t >= CHECK_WINDOW_US || (snapshot && snapshot.phase === 'halted');
    if (!windowClosed) return {status: 'waiting', messages: []};
    return {status: 'failed', messages: report.results.filter(r => !r.ok).map(r => r.message)};
};
