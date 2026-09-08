/**
 * ThingBot-exclusive block definitions for motors, servos, LEDs, the buzzer, the switch, and PS2 setup.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterBlocks } from '../../../shared/types'

const CORE_COLOUR = '#009933'
const ACTUATOR_COLOUR = '#cc0000'
const ELECTRONIC_COLOUR = '#6600ff'

/**
 * The board's five servo headers, as the dropdown the degree-based blocks share.
 * @returns The `SERVO` dropdown field definition.
 */
const servoField = () => ({
  type: 'field_dropdown' as const,
  name: 'SERVO',
  options: [
    ['S1', '1'],
    ['S2', '2'],
    ['S3', '3'],
    ['S4', '4'],
    ['S5', '5'],
  ],
})

/**
 * Note names carrying both notations: the international letter the block emits, and the solfège
 * syllable Vietnamese pupils learn first, so a learner can play from either.
 */
const NOTE_OPTIONS: [string, string][] = [
  ['C (Do)', 'C'],
  ['C# (Do#)', 'C#'],
  ['D (Re)', 'D'],
  ['D# (Re#)', 'D#'],
  ['E (Mi)', 'E'],
  ['F (Fa)', 'F'],
  ['F# (Fa#)', 'F#'],
  ['G (Sol)', 'G'],
  ['G# (Sol#)', 'G#'],
  ['A (La)', 'A'],
  ['A# (La#)', 'A#'],
  ['B (Si)', 'B'],
]

const OCTAVE_OPTIONS: [string, string][] = [
  ['3', '3'],
  ['4', '4'],
  ['5', '5'],
  ['6', '6'],
]

export const registerBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.thingBotC3_init = {
    init(this: Block) {
      this.jsonInit({
        message0: 'init ThingBot',
        colour: CORE_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_setMotor = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set motor %1 go %2 at %3',
        args0: [
          {
            type: 'field_dropdown',
            name: 'MOTOR',
            options: [
              ['M1', '1'],
              ['M2', '2'],
              ['M3', '3'],
              ['M4', '4'],
            ],
          },
          {
            type: 'field_dropdown',
            name: 'DIRECTION',
            options: [
              ['forward', 'forward'],
              ['backward', 'backward'],
            ],
          },
          { type: 'input_value', name: 'SPEED', check: 'Number' },
        ],
        colour: ACTUATOR_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_setServo = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set servo %1 to pulse %2',
        args0: [
          {
            type: 'field_dropdown',
            name: 'SERVO',
            options: [
              ['S1', '1'],
              ['S2', '2'],
              ['S3', '3'],
              ['S4', '4'],
              ['S5', '5'],
            ],
          },
          { type: 'input_value', name: 'PULSE', check: 'Number' },
        ],
        colour: ACTUATOR_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_setServoAngle = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set servo %1 to angle %2 degrees',
        args0: [servoField(), { type: 'input_value', name: 'ANGLE', check: 'Number' }],
        colour: ACTUATOR_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_moveServoAngle = {
    init(this: Block) {
      this.jsonInit({
        message0: 'move servo %1 to angle %2 degrees over %3 seconds',
        args0: [
          servoField(),
          { type: 'input_value', name: 'ANGLE', check: 'Number' },
          { type: 'input_value', name: 'SECONDS', check: 'Number' },
        ],
        colour: ACTUATOR_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_releaseServo = {
    init(this: Block) {
      this.jsonInit({
        message0: 'release servo %1',
        args0: [servoField()],
        colour: ACTUATOR_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_buzzer = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set buzzer to %1 pulse',
        args0: [{ type: 'input_value', name: 'SOUND', check: 'Number' }],
        colour: ELECTRONIC_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_setTempo = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set tempo to %1 BPM',
        args0: [{ type: 'input_value', name: 'TEMPO', check: 'Number' }],
        colour: ELECTRONIC_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_playNote = {
    init(this: Block) {
      this.jsonInit({
        message0: 'play note %1 octave %2 for %3 beats',
        args0: [
          { type: 'field_dropdown', name: 'NOTE', options: NOTE_OPTIONS },
          { type: 'field_dropdown', name: 'OCTAVE', options: OCTAVE_OPTIONS },
          { type: 'input_value', name: 'BEATS', check: 'Number' },
        ],
        colour: ELECTRONIC_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_rest = {
    init(this: Block) {
      this.jsonInit({
        message0: 'rest for %1 beats',
        args0: [{ type: 'input_value', name: 'BEATS', check: 'Number' }],
        colour: ELECTRONIC_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_setLed = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set led %1 %2',
        args0: [
          {
            type: 'field_dropdown',
            name: 'LED',
            options: [
              ['1', 'LED_1'],
              ['2', 'LED_2'],
            ],
          },
          { type: 'input_value', name: 'BRIGHTNESS', check: 'Number' },
        ],
        colour: ELECTRONIC_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_initPS2 = {
    init(this: Block) {
      this.jsonInit({
        message0: 'init PS2 on ThingBot',
        colour: '#FF3399',
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.thingBotC3_switch = {
    init(this: Block) {
      this.jsonInit({
        message0: 'read switch',
        colour: ELECTRONIC_COLOUR,
        extensions: ['output_boolean'],
      })
    },
  }
}
