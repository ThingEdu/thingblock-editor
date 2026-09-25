/** Toolbox category for phone control over Bluetooth. */
import type { ToolboxCategory } from '../../../shared/types'

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'Phone',
  colour: '#4C97FF',
  contents: [
    {
      kind: 'block',
      type: 'phoneControl_start',
      inputs: { NAME: { type: 'text', fields: { TEXT: 'ThingBot' } } },
    },
  ],
}

export default toolbox
