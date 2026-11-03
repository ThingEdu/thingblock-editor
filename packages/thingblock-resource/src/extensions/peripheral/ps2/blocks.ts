/** PS2 receiver blocks for setup, polling, button state, and joystick values. */
import type { Block } from '@thingblock/thingblock-blocks'
import { withTranslations } from '../../../shared/localize'
import type { RegisterBlocks } from '../../../shared/types'
import vi from './locales/vi.json'

const COLOUR = '#FF3399'
const SECONDARY_COLOUR = '#C71585'

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
  Blockly.Blocks.ps2_init = {
    init(this: Block) {
      this.jsonInit({
        message0: 'init PS2 receiver pin DIN %1 DOUT %2 CS %3 CLK %4',
        // Defaults are ThingBot's PS2 port, the same pins `init PS2 on ThingBot` uses.
        args0: [pinField('DIN', 7), pinField('DOUT', 2), pinField('CS', 10), pinField('CLK', 6)],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.ps2_readData = {
    init(this: Block) {
      this.jsonInit({
        message0: 'read PS2 receiver data',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.ps2_getButton = {
    init(this: Block) {
      this.jsonInit({
        message0: 'PS2 %1 button is pressed?',
        args0: [
          {
            type: 'field_dropdown',
            name: 'BUTTON',
            options: [
              ['up', 'PSB_PAD_UP'],
              ['down', 'PSB_PAD_DOWN'],
              ['left', 'PSB_PAD_LEFT'],
              ['right', 'PSB_PAD_RIGHT'],
              ['triangle', 'PSB_TRIANGLE'],
              ['circle', 'PSB_CIRCLE'],
              ['cross', 'PSB_CROSS'],
              ['square', 'PSB_SQUARE'],
              ['L1', 'PSB_L1'],
              ['L2', 'PSB_L2'],
              ['L3', 'PSB_L3'],
              ['R1', 'PSB_R1'],
              ['R2', 'PSB_R2'],
              ['R3', 'PSB_R3'],
              ['select', 'PSB_SELECT'],
              ['start', 'PSB_START'],
            ],
          },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_boolean'],
      })
    },
  }

  Blockly.Blocks.ps2_GetJoystick = {
    init(this: Block) {
      this.jsonInit({
        message0: 'PS2 get joystick %1',
        args0: [
          {
            type: 'field_dropdown',
            name: 'JOYSTICK',
            options: [
              ['LX', 'PSS_LX'],
              ['LY', 'PSS_LY'],
              ['RX', 'PSS_RX'],
              ['RY', 'PSS_RY'],
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
