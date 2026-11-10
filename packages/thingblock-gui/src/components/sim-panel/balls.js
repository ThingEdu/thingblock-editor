/**
 * The balls the learner can put in front of the IR eye on IO4, with what the eye reads for each: the same
 * ids and readings as thingblock-sim `hal/rig.ts` (`BALLS`, `NO_BALL_IR`), which the lesson checker grades.
 * Readings from ThingEdu/thingbot-sim `src/belt.ts` (commit bde12a2).
 * thingbot-sim is AGPL-3.0-only, the same licence as this package.
 */
const BALLS = [
    {id: 'none', ir: 80, color: null},
    {id: 'white', ir: 3500, color: '#f4f2ea'},
    {id: 'yellow', ir: 3100, color: '#f2c230'},
    {id: 'red', ir: 2300, color: '#d23c3c'},
    {id: 'blue', ir: 1100, color: '#2d6fb8'},
    {id: 'black', ir: 300, color: '#262626'}
];

/**
 * @param {string} id A ball's id.
 * @returns {object} That ball, or no ball for an unknown id.
 */
const ballById = id => BALLS.find(b => b.id === id) || BALLS[0];

export {BALLS, ballById};
