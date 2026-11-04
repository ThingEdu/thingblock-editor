/** Phone-control block: starts the BLE service, taking the name the phone will see. */
import type { Block } from '@thingblock/thingblock-blocks'
import { withTranslations } from '../../../shared/localize'
import type { RegisterBlocks } from '../../../shared/types'
import vi from './locales/vi.json'

const COLOUR = '#4C97FF'
const SECONDARY_COLOUR = '#3373CC'

const registerEnglishBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.phoneControl_start = {
    init(this: Block) {
      this.jsonInit({
        message0: 'allow phone control, board name %1',
        args0: [{ type: 'input_value', name: 'NAME', check: 'String' }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }
}

/** The pack's blocks, in the editor's language (English, or Vietnamese from `locales/vi.json`). */
export const registerBlocks: RegisterBlocks = withTranslations(registerEnglishBlocks, { vi })
