/**
 * PCA9685 blocks: init by IIC address, servo-mode setup with per-channel and all-channel angle
 * setters, and the raw PWM frequency/value controls.
 *
 * The source extension shipped three bespoke slider blocks purely as bounded numeric shadows; this
 * pack fills the same inputs with the built-in `math_whole_number` / `math_angle` shadows, which
 * already carry Arduino codegen.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterBlocks } from '../../../shared/types'

const COLOUR = '#9F4D95'
const SECONDARY_COLOUR = '#8F4586'

const CHANNEL_OPTIONS: [string, string][] = Array.from({ length: 16 }, (_, i) => [String(i), String(i)])

export const registerBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.pca9685_init = {
    init(this: Block) {
      this.jsonInit({
        message0: 'init pca9685 iic address %1',
        args0: [{ type: 'input_value', name: 'ADDR', check: 'Number' }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.pca9685_setToServoMode = {
    init(this: Block) {
      this.jsonInit({
        message0: 'pca9685 set to servo mode',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.pca9685_setServoAngle = {
    init(this: Block) {
      this.jsonInit({
        message0: 'pca9685 set channel %1 servo angle %2',
        args0: [
          { type: 'field_dropdown', name: 'CH', options: CHANNEL_OPTIONS },
          { type: 'input_value', name: 'ANGLE', check: 'Number' },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.pca9685_setAllServoAngle = {
    init(this: Block) {
      this.jsonInit({
        message0: 'pca9685 set all servo angle %1',
        args0: [{ type: 'input_value', name: 'ANGLE', check: 'Number' }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.pca9685_setPWMFrequency = {
    init(this: Block) {
      this.jsonInit({
        message0: 'pca9685 set pwm frequency %1',
        args0: [{ type: 'input_value', name: 'FREQ', check: 'Number' }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.pca9685_setChannelPWM = {
    init(this: Block) {
      this.jsonInit({
        message0: 'pca9685 set channel %1 pwm value %2',
        args0: [
          { type: 'field_dropdown', name: 'CH', options: CHANNEL_OPTIONS },
          { type: 'input_value', name: 'VALUE', check: 'Number' },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.pca9685_setAllChannelPWM = {
    init(this: Block) {
      this.jsonInit({
        message0: 'pca9685 set all channel pwm value %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }
}
