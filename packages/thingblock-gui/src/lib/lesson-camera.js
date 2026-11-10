/**
 * Grading of a lesson's Camera AI steps. Those rules are about the playground (the camera, the hands the
 * tracker sees, the objects, scores and message the program put there), so the lesson panel grades them
 * here from the VM's Camera AI events instead of asking the simulator worker.
 */
import {evaluateCameraRules, handsOnStage, isCameraRule} from '@thingblock/thingblock-sim/checker';

/** How long after Run a miss is still "checking…" rather than "not yet". */
export const CAMERA_CHECK_WINDOW_MS = 4000;

/** Hands older than this are gone: the tracker stopped, as the extension's blocks judge too. */
const STALE_MS = 1000;

/**
 * Whether a step is graded on the playground.
 * @param {{rules: Array<object>}} step A lesson step.
 * @returns {boolean} True when its rules are Camera AI rules.
 */
export const isCameraStep = step => step.rules.length > 0 && step.rules.every(isCameraRule);

/**
 * What the playground shows, in the shape the checker grades.
 * @param {object} seen The latest Camera AI events.
 * @param {boolean} seen.cameraOn The last camera status.
 * @param {?{hands: Array<object>, mirror: boolean, t: number}} seen.vision The last tracker frame.
 * @param {{objects: Array<object>, scores: Array<number>, say: string}} seen.playground The last playground.
 * @param {number} now The time now, in ms.
 * @returns {object} The checker's `CameraSnapshot`.
 */
export const cameraSnapshot = ({cameraOn, vision, playground}, now) => ({
    cameraOn,
    hands: cameraOn && vision && now - vision.t <= STALE_MS ? handsOnStage(vision) : [],
    objects: playground.objects,
    scores: playground.scores,
    say: playground.say
});

/**
 * The verdict box for a Camera AI step: passed as soon as every rule holds; before any Run, idle; for a
 * while after Run (or after the step opened) still checking; then the misses, in the learner's words.
 * @param {object} args
 * @param {Array<{ok: boolean, message: string}>} args.results The rules graded on the playground now.
 * @param {?number} args.ranAt When Run was last pressed, in ms; null if not since the lesson opened.
 * @param {number} args.stepAt When this step opened, in ms.
 * @param {number} args.now The time now, in ms.
 * @returns {{status: string, messages: string[]}} The verdict box state.
 */
export const decideCameraCheck = ({results, ranAt, stepAt, now}) => {
    if (results.every(r => r.ok)) return {status: 'passed', messages: []};
    if (ranAt === null) return {status: 'idle', messages: []};
    if (now - Math.max(ranAt, stepAt) < CAMERA_CHECK_WINDOW_MS) return {status: 'waiting', messages: []};
    return {status: 'failed', messages: results.filter(r => !r.ok).map(r => r.message)};
};

/**
 * Grade a Camera AI step now.
 * @param {{rules: Array<object>}} step The step.
 * @param {object} seen The latest Camera AI events, as `cameraSnapshot` takes them.
 * @param {number} now The time now, in ms.
 * @returns {Array<{ok: boolean, message: string}>} One result per rule.
 */
export const gradeCameraStep = (step, seen, now) => evaluateCameraRules(step.rules, cameraSnapshot(seen, now));
