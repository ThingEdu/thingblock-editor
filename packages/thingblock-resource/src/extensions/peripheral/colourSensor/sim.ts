/**
 * Colour sensor simulator codegen, call for call with `generator.ts`: each raw channel is the rig's
 * `adccolour_<channel>` input, and the colour is named by the same rules, ported line for line.
 */
import type { RegisterSimGenerators } from '../../../shared/types'
import { COLOUR_DARK, COLOUR_EVEN, COLOUR_NAMES, COLOUR_WHITE, channelIndex, colourCode } from './colours'

/** `colourSensorClass()` and `colourSensorName()` from `generator.ts`, with C's integer division. */
export const SIM_HELPERS = [
  'function colourSensorClass() {',
  "  const [r, g, b, c] = [0, 1, 2, 3].map((ch) => $.analogRead('colour_' + ch));",
  '  const sum = r + g + b;',
  `  if (c < ${COLOUR_DARK} || sum === 0) return 0;`,
  '  const rp = Math.floor((r * 100) / sum), gp = Math.floor((g * 100) / sum), bp = Math.floor((b * 100) / sum);',
  '  const hi = Math.max(rp, gp, bp), lo = Math.min(rp, gp, bp);',
  `  if (hi - lo <= ${COLOUR_EVEN}) return c >= ${COLOUR_WHITE} ? 5 : 0;`,
  '  if (rp + gp >= 75 && Math.abs(rp - gp) <= 15) return 4;',
  '  if (rp === hi) return 1;',
  '  if (gp === hi) return 2;',
  '  return 3;',
  '}',
  `const colourSensorNames = ${JSON.stringify(COLOUR_NAMES)};`,
  'function colourSensorName() {',
  '  return colourSensorNames[colourSensorClass()];',
  '}',
].join('\n')

export const registerSimGenerators: RegisterSimGenerators = (generator, Order) => {
  const registerHelpers = () => generator.globals.set('colourSensor', SIM_HELPERS)

  generator.forBlock.colourSensor_init = () => ''

  generator.forBlock.colourSensor_read = (block) => [
    `$.analogRead("colour_${channelIndex(block.getFieldValue('CHANNEL'))}")`,
    Order.ATOMIC,
  ]
  generator.typeFor.colourSensor_read = () => 'int'

  generator.forBlock.colourSensor_is = (block) => {
    registerHelpers()
    return [`(colourSensorClass() === ${colourCode(block.getFieldValue('COLOUR'))})`, Order.ATOMIC]
  }
  generator.typeFor.colourSensor_is = () => 'bool'

  generator.forBlock.colourSensor_name = () => {
    registerHelpers()
    return ['colourSensorName()', Order.ATOMIC]
  }
  generator.typeFor.colourSensor_name = () => 'String'
}
