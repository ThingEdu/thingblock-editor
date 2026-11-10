/**
 * Colour sensor blocks: start the TCS34725, read one raw channel, and name the colour it sees with the
 * simple rules in `generator.ts`.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import { withTranslations } from '../../../shared/localize'
import type { RegisterBlocks } from '../../../shared/types'
import { CHANNELS, COLOURS } from './colours'
import vi from './locales/vi.json'

const COLOUR = '#D65CB4'
const SECONDARY_COLOUR = '#B44595'

const registerEnglishBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.colourSensor_init = {
    init(this: Block) {
      this.jsonInit({
        message0: 'start colour sensor',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }
  Blockly.Blocks.colourSensor_read = {
    init(this: Block) {
      this.jsonInit({
        message0: 'colour sensor %1',
        args0: [{ type: 'field_dropdown', name: 'CHANNEL', options: CHANNELS }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_number'],
      })
    },
  }
  Blockly.Blocks.colourSensor_is = {
    init(this: Block) {
      this.jsonInit({
        message0: 'colour sensor sees %1?',
        args0: [{ type: 'field_dropdown', name: 'COLOUR', options: COLOURS }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_boolean'],
      })
    },
  }
  Blockly.Blocks.colourSensor_name = {
    init(this: Block) {
      this.jsonInit({
        message0: 'colour name',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_string'],
      })
    },
  }
}

/** The pack's blocks, in the editor's language (English, or Vietnamese from `locales/vi.json`). */
export const registerBlocks: RegisterBlocks = withTranslations(registerEnglishBlocks, { vi })
