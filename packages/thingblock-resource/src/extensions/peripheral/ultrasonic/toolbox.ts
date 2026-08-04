/** Toolbox category for the Ultrasonic distance sensor peripheral. */
import type { ToolboxCategory } from '../../../shared/types'

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'Ultrasonic',
  colour: '#D39DDB',
  contents: [{ kind: 'block', type: 'ultrasonic_readDistance' }],
}

export default toolbox
