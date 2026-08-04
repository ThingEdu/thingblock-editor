/** Ultrasonic distance sensor block: TRIG/ECHO pins plus a unit dropdown, reporting a number. */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterBlocks } from '../../../shared/types'

const COLOUR = '#D39DDB'
const SECONDARY_COLOUR = '#BA55D3'

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
  Blockly.Blocks.ultrasonic_readDistance = {
    init(this: Block) {
      this.jsonInit({
        message0: 'ultrasonic sensor pin TRIG %1 ECHO %2 read distance %3',
        args0: [
          pinField('TRIG', 2),
          pinField('ECHO', 3),
          {
            type: 'field_dropdown',
            name: 'UNIT',
            options: [
              ['cm', 'CM'],
              ['inch', 'INC'],
            ],
          },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_number'],
      })
    },
  }
}
