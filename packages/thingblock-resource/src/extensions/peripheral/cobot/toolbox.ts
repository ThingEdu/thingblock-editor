/** Toolbox category for the Cobot IR sensors. */
import type { ToolboxCategory } from '../../../shared/types'

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'Cobot IR',
  colour: '#4CAF8F',
  contents: [
    { kind: 'block', type: 'cobot_irLight' },
    { kind: 'block', type: 'cobot_readIr' },
  ],
}

export default toolbox
