/**
 * CoBot block definitions: the two wheels, the four line eyes under the front edge, and the IR and white
 * lights. Speeds are percentages, −100…100, and a negative speed turns a wheel backwards.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import { withTranslations } from '../../../shared/localize'
import type { RegisterBlocks } from '../../../shared/types'
import vi from './locales/vi.json'

// Number inputs also take variable reporters, whose output scratch-blocks types as String.
const NUMBER_INPUT = ['Number', 'String']

const CORE_COLOUR = '#0FA3A3'
const MOTOR_COLOUR = '#E8590C'
const EYE_COLOUR = '#5C6BC0'

/** Eye menu: value is the eye number, 1 (left) … 4 (right), as makerviet/cobot-arduino numbers them. */
export const EYES: [string, string][] = [
  ['1', '1'],
  ['2', '2'],
  ['3', '3'],
  ['4', '4'],
]

/** Ways the car moves as a whole: the value names the left and right wheel speeds in `generator.ts`. */
export const MOVES: [string, string][] = [
  ['forward', 'forward'],
  ['backward', 'backward'],
  ['turn left', 'turnLeft'],
  ['turn right', 'turnRight'],
  ['spin left', 'spinLeft'],
  ['spin right', 'spinRight'],
]

const onOff = {
  type: 'field_dropdown' as const,
  name: 'STATE',
  options: [
    ['on', 'HIGH'],
    ['off', 'LOW'],
  ],
}

const registerEnglishBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.cobotC3_init = {
    init(this: Block) {
      this.jsonInit({
        message0: 'start CoBot',
        tooltip: 'Sets up the motors, turns the IR lights of the eyes on and the white light off.',
        colour: CORE_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.cobotC3_drive = {
    init(this: Block) {
      this.jsonInit({
        message0: 'CoBot %1 at speed %2 %%',
        args0: [
          { type: 'field_dropdown', name: 'MOVE', options: MOVES },
          { type: 'input_value', name: 'SPEED', check: NUMBER_INPUT },
        ],
        tooltip:
          'Turn: one wheel stops and the other runs. Spin: the wheels run opposite ways, so CoBot turns on the spot.',
        colour: MOTOR_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.cobotC3_stop = {
    init(this: Block) {
      this.jsonInit({
        message0: 'stop CoBot',
        colour: MOTOR_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.cobotC3_setMotor = {
    init(this: Block) {
      this.jsonInit({
        message0: '%1 motor speed %2 %%',
        args0: [
          {
            type: 'field_dropdown',
            name: 'MOTOR',
            options: [
              ['left', 'left'],
              ['right', 'right'],
            ],
          },
          { type: 'input_value', name: 'SPEED', check: NUMBER_INPUT },
        ],
        tooltip: '-100 to 100: a negative speed turns the wheel backwards, 0 stops it.',
        colour: MOTOR_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.cobotC3_setTrim = {
    init(this: Block) {
      this.jsonInit({
        message0: 'right wheel faster than left by %1 %%',
        args0: [{ type: 'input_value', name: 'PERCENT', check: NUMBER_INPUT }],
        tooltip:
          'Two motors never turn at exactly the same speed. If CoBot drifts right when going straight, give the right wheel a little more (try 10); if it drifts left, use a negative number.',
        colour: MOTOR_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.cobotC3_readEye = {
    init(this: Block) {
      this.jsonInit({
        message0: 'eye %1 reading',
        args0: [{ type: 'field_dropdown', name: 'EYE', options: EYES }],
        tooltip: '0 to 4095: how much infrared comes back to the eye from the floor under it.',
        colour: EYE_COLOUR,
        extensions: ['output_number'],
      })
    },
  }

  Blockly.Blocks.cobotC3_onLine = {
    init(this: Block) {
      this.jsonInit({
        message0: 'eye %1 sees the line?',
        args0: [{ type: 'field_dropdown', name: 'EYE', options: EYES }],
        colour: EYE_COLOUR,
        extensions: ['output_boolean'],
      })
    },
  }

  Blockly.Blocks.cobotC3_setLine = {
    init(this: Block) {
      this.jsonInit({
        message0: 'eyes see the line when the reading is %1 %2',
        args0: [
          {
            type: 'field_dropdown',
            name: 'SIDE',
            options: [
              ['at most', 'below'],
              ['at least', 'above'],
            ],
          },
          { type: 'input_value', name: 'THRESHOLD', check: NUMBER_INPUT },
        ],
        tooltip: 'The threshold splits line from floor. Read the eyes over both and pick a number in between.',
        colour: EYE_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.cobotC3_pattern = {
    init(this: Block) {
      this.jsonInit({
        message0: 'eye pattern',
        tooltip: 'Four digits, eye 1 to eye 4: 1 sees the line, 0 does not. "0110" means the two middle eyes see it.',
        colour: EYE_COLOUR,
        extensions: ['output_string'],
      })
    },
  }

  Blockly.Blocks.cobotC3_patternIs = {
    init(this: Block) {
      this.jsonInit({
        message0: 'eye pattern is %1?',
        args0: [{ type: 'input_value', name: 'PATTERN' }],
        tooltip: 'Four digits, eye 1 to eye 4: 1 sees the line, 0 does not. Write x for an eye that may be either.',
        colour: EYE_COLOUR,
        extensions: ['output_boolean'],
      })
    },
  }

  Blockly.Blocks.cobotC3_irLight = {
    init(this: Block) {
      this.jsonInit({
        message0: 'eye IR lights %1',
        args0: [onOff],
        tooltip: 'The eyes only see the line while their IR lights are on.',
        colour: CORE_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.cobotC3_whiteLight = {
    init(this: Block) {
      this.jsonInit({
        message0: 'white light %1',
        args0: [onOff],
        tooltip: 'Lights the floor under the colour sensor, so colours read the same in a dark room.',
        colour: CORE_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }
}

/** The pack's blocks, in the editor's language (English, or Vietnamese from `locales/vi.json`). */
export const registerBlocks: RegisterBlocks = withTranslations(registerEnglishBlocks, { vi })
