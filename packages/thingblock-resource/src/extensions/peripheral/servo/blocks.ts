/**
 * Servo peripheral block definitions. Registered against the editor's injected Blockly so the palette
 * shapes live in the same instance the workspace uses.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import type { RegisterBlocks } from '../../../shared/types'

export const registerBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.servo_setangle = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set servo pin %1 to %2 degrees',
        args0: [
          { type: 'input_value', name: 'PIN', check: 'Number' },
          { type: 'input_value', name: 'ANGLE', check: 'Number' },
        ],
        category: 'servo',
        extensions: ['colours_more', 'shape_statement'],
      })
    },
  }
}
