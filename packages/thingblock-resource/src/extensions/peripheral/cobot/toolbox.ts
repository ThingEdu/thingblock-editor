/** Toolbox category for the Cobot IR and colour sensors. */
import type { ToolboxCategory } from '../../../shared/types'

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'Cobot',
  colour: '#4CAF8F',
  contents: [
    { kind: 'block', type: 'cobot_irLight' },
    { kind: 'block', type: 'cobot_readIr' },
    { kind: 'block', type: 'cobot_colourLight' },
    { kind: 'block', type: 'cobot_readColour' },
  ],
}

export default toolbox
