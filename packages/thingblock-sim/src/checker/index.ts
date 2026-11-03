// packages/thingblock-sim/src/checker/index.ts
export { evaluateLogRules, type RuleResult } from './evaluate'
export { inputsFor } from './inputs'
export { BLINK_MAX_PERIOD_S, parseRule, RuleSyntaxError } from './rules'
export type { DistanceOp, LightName, MotorName, Rule, ServoName } from './rules'
