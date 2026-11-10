/** Toolbox category for the I2C colour sensor. */
import type { ToolboxCategory } from '../../../shared/types'

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'Colour',
  colour: '#D65CB4',
  contents: [
    { kind: 'block', type: 'colourSensor_init' },
    { kind: 'block', type: 'colourSensor_read' },
    { kind: 'block', type: 'colourSensor_is' },
    { kind: 'block', type: 'colourSensor_name' },
  ],
}

export default toolbox
