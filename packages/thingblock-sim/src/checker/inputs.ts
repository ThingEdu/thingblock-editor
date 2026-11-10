// packages/thingblock-sim/src/checker/inputs.ts
/**
 * The rig settings that make a step's input rules hold ("giữ nút SW", "khoảng cách < 20 cm", "giữ nút PS2
 * lên", "chọn bóng tối màu"), and the egg belt for the sorting rules. The editor leaves them to the learner; the lesson fixtures apply them before grading a solution
 * headless, so a solution is graded in the situation the step describes.
 */
import { BALLS, BELT_INPUT, IR_INPUT } from '../hal/rig'
import { DISTANCE_INPUT, ps2Input } from '../hal/sensors'
import type { Rule } from './rules'
import { SWITCH_GPIO } from './thingbot-map'

/** The distance slider's range in the simulator panel, in centimetres. */
const DISTANCE_MIN_CM = 2
const DISTANCE_MAX_CM = 400

/**
 * @param rules A step's rules; output rules are ignored.
 * @returns Rig input key to value, for `Session.setInput`.
 */
export function inputsFor(rules: readonly Rule[]): Record<string, number> {
  const inputs: Record<string, number> = {}
  for (const rule of rules) {
    if (rule.kind === 'switch') inputs[`gpio${SWITCH_GPIO}`] = rule.held ? 0 : 1
    else if (rule.kind === 'ps2') inputs[ps2Input(rule.button)] = 1
    else if (rule.kind === 'distance') {
      const near = rule.op === '<' || rule.op === '≤'
      inputs[DISTANCE_INPUT] = near
        ? Math.max(DISTANCE_MIN_CM, Math.floor(rule.cm / 2))
        : Math.min(DISTANCE_MAX_CM, Math.max(rule.cm * 2, rule.cm + 1))
    } else if (rule.kind === 'ball') {
      // The darkest or the brightest ball (BALLS runs brightest first): the one furthest from the threshold.
      inputs[IR_INPUT] = (rule.dark ? BALLS[BALLS.length - 1] : BALLS[0]).ir
    } else if (rule.kind === 'sorted' || rule.kind === 'rejected') inputs[BELT_INPUT] = 1
  }
  return inputs
}
