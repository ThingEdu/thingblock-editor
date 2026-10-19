/** Toolbox category for the Rotary Encoder peripheral. */
import type { ToolboxCategory } from '../../../shared/types'

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'Encoder',
  colour: '#4C97FF',
  contents: [
    { kind: 'block', type: 'encoder_init' },
    { kind: 'block', type: 'encoder_readPosition' },
    { kind: 'block', type: 'encoder_resetPosition' },
    { kind: 'block', type: 'encoder_isPressed' },
  ],
}

export default toolbox
