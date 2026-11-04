/**
 * Servo peripheral block definitions. Registered against the editor's injected Blockly so the palette
 * shapes live in the same instance the workspace uses.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import { withTranslations } from '../../../shared/localize'
import type { RegisterBlocks } from '../../../shared/types'
import vi from './locales/vi.json'

// Number inputs also take variable reporters, whose output scratch-blocks types as String.
const NUMBER_INPUT = ['Number', 'String']

const registerEnglishBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.servo_setangle = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set servo pin %1 to %2 degrees',
        args0: [
          { type: 'input_value', name: 'PIN', check: NUMBER_INPUT },
          { type: 'input_value', name: 'ANGLE', check: NUMBER_INPUT },
        ],
        category: 'servo',
        extensions: ['colours_more', 'shape_statement'],
      })
    },
  }
}

/** The pack's blocks, in the editor's language (English, or Vietnamese from `locales/vi.json`). */
export const registerBlocks: RegisterBlocks = withTranslations(registerEnglishBlocks, { vi })
