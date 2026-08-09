/**
 * SSD1306 OLED blocks: init, the GFX drawing primitives (line, rect, circle, round rect, triangle,
 * each in outline and filled form), text size/cursor/print, and the clear/refresh/scroll controls.
 *
 * Drawing colours are the driver's own `SSD1306_*` constants, emitted verbatim into the generated
 * code. Scroll row bounds are the driver's page indices (`0x00`-`0x07`), which is why they are
 * dropdowns of preset rows rather than free numbers.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterBlocks } from '../../../shared/types'

const COLOUR = '#C0C0C0'
const SECONDARY_COLOUR = '#A9A9A9'

const DRAW_COLOURS: [string, string][] = [
  ['white', 'SSD1306_WHITE'],
  ['black', 'SSD1306_BLACK'],
  ['inverse', 'SSD1306_INVERSE'],
]

const TEXT_COLOURS: [string, string][] = [
  ['white', 'SSD1306_WHITE'],
  ['black', 'SSD1306_BLACK'],
]

const colourField = (name = 'COLOUR', options = DRAW_COLOURS) => ({
  type: 'field_dropdown' as const,
  name,
  options,
})

const numberInput = (name: string) => ({
  type: 'input_value' as const,
  name,
  check: 'Number',
})

export const registerBlocks: RegisterBlocks = (Blockly) => {
  Blockly.Blocks.oled_init = {
    init(this: Block) {
      this.jsonInit({
        message0: 'init oled width %1 height %2 I2C address %3',
        args0: [
          numberInput('W'),
          numberInput('H'),
          {
            type: 'field_dropdown',
            name: 'ADDR',
            options: [
              ['0x78 (0x3c)', '0x3c'],
              ['0x7a (0x3d)', '0x3d'],
            ],
          },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.oled_drawLine = {
    init(this: Block) {
      this.jsonInit({
        message0: 'oled draw line x0: %1 y0: %2, x1: %3 y1: %4 color %5',
        args0: [numberInput('X0'), numberInput('Y0'), numberInput('X1'), numberInput('Y1'), colourField()],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  for (const [opcode, verb] of [
    ['oled_drawRect', 'draw'],
    ['oled_fillRect', 'fill'],
  ] as const) {
    Blockly.Blocks[opcode] = {
      init(this: Block) {
        this.jsonInit({
          message0: `oled ${verb} rect x: %1 y: %2 width %3 height %4 color %5`,
          args0: [numberInput('X'), numberInput('Y'), numberInput('W'), numberInput('H'), colourField()],
          colour: COLOUR,
          secondaryColour: SECONDARY_COLOUR,
          extensions: ['shape_statement'],
        })
      },
    }
  }

  for (const [opcode, verb] of [
    ['oled_drawCircle', 'draw'],
    ['oled_fillCircle', 'fill'],
  ] as const) {
    Blockly.Blocks[opcode] = {
      init(this: Block) {
        this.jsonInit({
          message0: `oled ${verb} circle x: %1 y: %2 radius %3 color %4`,
          args0: [numberInput('X'), numberInput('Y'), numberInput('R'), colourField()],
          colour: COLOUR,
          secondaryColour: SECONDARY_COLOUR,
          extensions: ['shape_statement'],
        })
      },
    }
  }

  for (const [opcode, verb] of [
    ['oled_drawRoundRect', 'draw'],
    ['oled_fillRoundRect', 'fill'],
  ] as const) {
    Blockly.Blocks[opcode] = {
      init(this: Block) {
        this.jsonInit({
          message0: `oled ${verb} round rect x: %1 y: %2 width %3 height %4 radius %5 color %6`,
          args0: [
            numberInput('X'),
            numberInput('Y'),
            numberInput('W'),
            numberInput('H'),
            numberInput('R'),
            colourField(),
          ],
          colour: COLOUR,
          secondaryColour: SECONDARY_COLOUR,
          extensions: ['shape_statement'],
        })
      },
    }
  }

  for (const [opcode, verb] of [
    ['oled_drawTriangle', 'draw'],
    ['oled_fillTriangle', 'fill'],
  ] as const) {
    Blockly.Blocks[opcode] = {
      init(this: Block) {
        this.jsonInit({
          message0: `oled ${verb} triangle x0: %1 y0: %2, x1: %3 y1: %4, x2: %5 y2: %6 color %7`,
          args0: [
            numberInput('X0'),
            numberInput('Y0'),
            numberInput('X1'),
            numberInput('Y1'),
            numberInput('X2'),
            numberInput('Y2'),
            colourField(),
          ],
          colour: COLOUR,
          secondaryColour: SECONDARY_COLOUR,
          extensions: ['shape_statement'],
        })
      },
    }
  }

  Blockly.Blocks.oled_setText = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set oled text size %1 color %2 background color %3',
        args0: [
          {
            type: 'field_dropdown',
            name: 'SIZE',
            options: [
              ['6x8', '1'],
              ['12x16', '2'],
              ['18x24', '3'],
              ['24x32', '4'],
              ['30x40', '5'],
              ['36x48', '6'],
              ['42x56', '7'],
              ['48x64', '8'],
            ],
          },
          colourField('COLOUR', TEXT_COLOURS),
          colourField('BGCOLOR', TEXT_COLOURS),
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.oled_setCursor = {
    init(this: Block) {
      this.jsonInit({
        message0: 'set oled cursor x: %1 y: %2',
        args0: [numberInput('X'), numberInput('Y')],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.oled_print = {
    init(this: Block) {
      this.jsonInit({
        message0: 'oled print %1 %2',
        args0: [
          { type: 'input_value', name: 'DATA' },
          {
            type: 'field_dropdown',
            name: 'EOL',
            options: [
              ['warp', 'warp'],
              ['no-warp', 'noWarp'],
            ],
          },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.oled_clear = {
    init(this: Block) {
      this.jsonInit({
        message0: 'clear oled',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.oled_refresh = {
    init(this: Block) {
      this.jsonInit({
        message0: 'refresh oled display',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.oled_startScroll = {
    init(this: Block) {
      this.jsonInit({
        message0: 'oled start scroll %1 y0: %2 y1: %3',
        args0: [
          {
            type: 'field_dropdown',
            name: 'TYPE',
            options: [
              ['right', '0'],
              ['left', '1'],
              ['diag right', '2'],
              ['diag left', '3'],
            ],
          },
          {
            type: 'field_dropdown',
            name: 'Y0',
            options: [
              ['0', '0x00'],
              ['8', '0x01'],
              ['16', '0x02'],
              ['24', '0x03'],
              ['32', '0x04'],
              ['40', '0x05'],
              ['48', '0x06'],
              ['56', '0x07'],
            ],
          },
          {
            type: 'field_dropdown',
            name: 'Y1',
            options: [
              ['8', '0x00'],
              ['16', '0x01'],
              ['24', '0x02'],
              ['32', '0x03'],
              ['40', '0x04'],
              ['48', '0x05'],
              ['56', '0x06'],
              ['64', '0x07'],
            ],
          },
        ],
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }

  Blockly.Blocks.oled_stopScroll = {
    init(this: Block) {
      this.jsonInit({
        message0: 'oled stop scroll',
        colour: COLOUR,
        secondaryColour: SECONDARY_COLOUR,
        extensions: ['shape_statement'],
      })
    },
  }
}
