/** Toolbox category shown while the CoBot device is selected. */
import type { ToolboxCategory } from '../../../shared/types'

const speed = (n: number) => ({ SPEED: { type: 'math_number', fields: { NUM: n } } })

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'CoBot',
  colour: '#0FA3A3',
  contents: [
    { kind: 'block', type: 'cobotC3_init' },
    { kind: 'block', type: 'cobotC3_drive', inputs: speed(50) },
    { kind: 'block', type: 'cobotC3_stop' },
    { kind: 'block', type: 'cobotC3_setMotor', inputs: speed(50) },
    { kind: 'block', type: 'cobotC3_setTrim', inputs: { PERCENT: { type: 'math_number', fields: { NUM: 10 } } } },
    { kind: 'block', type: 'cobotC3_readEye' },
    { kind: 'block', type: 'cobotC3_onLine' },
    {
      kind: 'block',
      type: 'cobotC3_setLine',
      inputs: { THRESHOLD: { type: 'math_number', fields: { NUM: 2000 } } },
    },
    { kind: 'block', type: 'cobotC3_pattern' },
    { kind: 'block', type: 'cobotC3_patternIs', inputs: { PATTERN: { type: 'text', fields: { TEXT: '0110' } } } },
    { kind: 'block', type: 'cobotC3_irLight' },
    { kind: 'block', type: 'cobotC3_whiteLight' },
  ],
}

export default toolbox
