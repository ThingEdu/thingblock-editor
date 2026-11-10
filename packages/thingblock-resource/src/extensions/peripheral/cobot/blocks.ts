/**
 * Cobot sensor blocks: the four analog IR reflectance sensors under the Cobot chassis and the TCS34725
 * colour sensor on its I2C bus. Pin numbers follow makerviet/cobot-arduino (`SENSOR_1_PIN` … `SENSOR_4_PIN`,
 * `IR_LED_ON`, `W_LED_ON`). The IR read takes the GPIO itself, so the same block reads a single IR module
 * plugged into a ThingBot sensor port (IO4 or IO0).
 */
import type { Block } from '@thingblock/thingblock-blocks'
import { withTranslations } from '../../../shared/localize'
import type { RegisterBlocks } from '../../../shared/types'
import vi from './locales/vi.json'

const COLOUR = '#4CAF8F'
const SECONDARY_COLOUR = '#3A8C72'

/** IR sensor menu: label `n · IOx`, value the GPIO, in the order cobot-arduino numbers them. */
export const IR_SENSORS: [string, string][] = [
  ['1 · IO4', '4'],
  ['2 · IO3', '3'],
  ['3 · IO1', '1'],
  ['4 · IO0', '0'],
]

/** Colour sensor channels: value is the index into `getRawData`'s r, g, b, c outputs. */
export const COLOUR_CHANNELS: [string, string][] = [
  ['red', '0'],
  ['green', '1'],
  ['blue', '2'],
  ['brightness', '3'],
]

const onOff = {
  type: 'field_dropdown' as const,
  name: 'STATE',
  options: [
    ['on', 'HIGH'],
    ['off', 'LOW'],
  ],
}

const registerEnglishBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.cobot_readIr = {
    init(this: Block) {
      this.jsonInit({
        message0: 'read IR sensor %1',
        args0: [{ type: 'field_dropdown', name: 'PIN', options: IR_SENSORS }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_number'],
      })
    },
  }
  Blockly.Blocks.cobot_irLight = {
    init(this: Block) {
      this.jsonInit({
        message0: 'turn Cobot IR lights %1',
        args0: [onOff],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }
  Blockly.Blocks.cobot_readColour = {
    init(this: Block) {
      this.jsonInit({
        message0: 'read colour sensor %1',
        args0: [{ type: 'field_dropdown', name: 'CHANNEL', options: COLOUR_CHANNELS }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_number'],
      })
    },
  }
  Blockly.Blocks.cobot_colourLight = {
    init(this: Block) {
      this.jsonInit({
        message0: 'turn colour sensor light %1',
        args0: [onOff],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }
}

/** The pack's blocks, in the editor's language (English, or Vietnamese from `locales/vi.json`). */
export const registerBlocks: RegisterBlocks = withTranslations(registerEnglishBlocks, { vi })
