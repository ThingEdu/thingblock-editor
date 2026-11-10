// packages/thingblock-sim/src/checker/index.ts
export { evaluateCameraRules, handsOnStage, type CameraSnapshot, type StageHand, type VisionResults } from './camera'
export { evaluateLogRules, type RuleResult } from './evaluate'
export { inputsFor } from './inputs'
export { BLINK_MAX_PERIOD_S, isCameraRule, parseRule, RuleSyntaxError } from './rules'
export type { CameraRule, DistanceOp, LightName, MotorName, Rule, ServoName } from './rules'
