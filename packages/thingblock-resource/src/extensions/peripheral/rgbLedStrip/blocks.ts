/**
 * RGB LED strip blocks: init, per-pixel and range colour setters, an R/G/B colour reporter, and the
 * brightness/clear/show controls. Pixel indices are 1-based in the palette; the generator subtracts
 * one for the library's 0-based API.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterBlocks } from '../../../shared/types'

const COLOUR = '#7700FF'
const SECONDARY_COLOUR = '#4400B3'

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
  Blockly.Blocks.rgbLedStrip_init = {
    init(this: Block) {
      this.jsonInit({
        message0: 'init rgb led strip length %1 pin %2',
        args0: [{ type: 'input_value', name: 'LEN', check: 'Number' }, pinField('PIN', 2)],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.rgbLedStrip_setPixelColor = {
    init(this: Block) {
      this.jsonInit({
        message0: 'rgb led set pixel %1 color %2',
        args0: [
          { type: 'input_value', name: 'NO', check: 'Number' },
          { type: 'input_value', name: 'COLOR' },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.rgbLedStrip_fill = {
    init(this: Block) {
      this.jsonInit({
        message0: 'rgb led fill from pixel %1 count %2 with color %3',
        args0: [
          { type: 'input_value', name: 'FIRST', check: 'Number' },
          { type: 'input_value', name: 'COUNT', check: 'Number' },
          { type: 'input_value', name: 'COLOR' },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.rgbLedStrip_color = {
    init(this: Block) {
      this.jsonInit({
        message0: 'rgb led strip color R %1 G %2 B %3',
        args0: [
          { type: 'input_value', name: 'R', check: 'Number' },
          { type: 'input_value', name: 'G', check: 'Number' },
          { type: 'input_value', name: 'B', check: 'Number' },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_number'],
      })
    },
  }

  Blockly.Blocks.rgbLedStrip_setBrightness = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set rgb led brightness %1',
        args0: [{ type: 'input_value', name: 'BRT', check: 'Number' }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.rgbLedStrip_clear = {
    init(this: Block) {
      this.jsonInit({
        message0: 'clear all rgb led',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.rgbLedStrip_show = {
    init(this: Block) {
      this.jsonInit({
        message0: 'refresh rgb led display',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }
}
