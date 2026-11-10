/** Ultrasonic distance sensor block: TRIG/ECHO pins plus a unit dropdown, reporting a number. */
import type { Block } from '@thingblock/thingblock-blocks'
import { withTranslations } from '../../../shared/localize'
import type { RegisterBlocks } from '../../../shared/types'
import vi from './locales/vi.json'

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

const registerEnglishBlocks: RegisterBlocks = (Blockly) => {
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

/** The pack's blocks, in the editor's language (English, or Vietnamese from `locales/vi.json`). */
export const registerBlocks: RegisterBlocks = withTranslations(registerEnglishBlocks, { vi })
