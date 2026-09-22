/** Phone-control block: starts the BLE service, taking the name the phone will see. */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterBlocks } from '../../../shared/types'

const COLOUR = '#4C97FF'
const SECONDARY_COLOUR = '#3373CC'

export const registerBlocks: RegisterBlocks = (Blockly) => {
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
