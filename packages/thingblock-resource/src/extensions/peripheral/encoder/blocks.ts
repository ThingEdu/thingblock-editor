/**
 * Rotary encoder blocks: init with the A/B phase pins and the button pin, the turn count (one step per
 * detent click), resetting that count, and whether the knob's button is held down.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterBlocks } from '../../../shared/types'

const COLOUR = '#4C97FF'
const SECONDARY_COLOUR = '#3373CC'

// The editor registers `field_number` as a FieldTextInput subclass, which reads its initial value
// from the `text` key (not `value`), so the default pin number is supplied there.
const pinField = (name: string, value: number) => ({
  type: 'field_number' as const,
  name,
  text: String(value),
  min: 0,
  precision: 1,
})

export const registerBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.encoder_init = {
    init(this: Block) {
      this.jsonInit({
        message0: 'init encoder pin A %1 pin B %2 button pin %3',
        args0: [pinField('PIN_A', 2), pinField('PIN_B', 10), pinField('PIN_BTN', 7)],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.encoder_readPosition = {
    init(this: Block) {
      this.jsonInit({
        message0: 'encoder position',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_number'],
      })
    },
  }

  Blockly.Blocks.encoder_resetPosition = {
    init(this: Block) {
      this.jsonInit({
        message0: 'reset encoder position',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.encoder_isPressed = {
    init(this: Block) {
      this.jsonInit({
        message0: 'encoder button pressed?',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_boolean'],
      })
    },
  }
}
