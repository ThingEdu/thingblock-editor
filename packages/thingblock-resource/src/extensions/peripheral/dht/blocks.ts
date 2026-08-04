/**
 * DHT sensor blocks: init (pin + model) plus humidity/temperature readers, all keyed by an instance
 * number so multiple DHT sensors on different pins stay independent.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterBlocks } from '../../../shared/types'

const COLOUR = '#42CCFF'
const SECONDARY_COLOUR = '#00BFFF'

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
  Blockly.Blocks.dht_init = {
    init(this: Block) {
      this.jsonInit({
        message0: 'init dht %1 pin %2 model %3',
        args0: [
          { type: 'input_value', name: 'NO', check: 'Number' },
          pinField('PIN', 2),
          {
            type: 'field_dropdown',
            name: 'MODEL',
            options: [
              ['dht11', '11'],
              ['dht21', '21'],
              ['dht22', '22'],
            ],
          },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.dht_readHumidity = {
    init(this: Block) {
      this.jsonInit({
        message0: 'dht %1 read humidity',
        args0: [{ type: 'input_value', name: 'NO', check: 'Number' }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['output_number'],
      })
    },
  }

  Blockly.Blocks.dht_readTemperature = {
    init(this: Block) {
      this.jsonInit({
        message0: 'dht %1 read temperature %2',
        args0: [
          { type: 'input_value', name: 'NO', check: 'Number' },
          {
            type: 'field_dropdown',
            name: 'UNIT',
            options: [
              ['℃', 'false'],
              ['℉', 'true'],
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
