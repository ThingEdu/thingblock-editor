/**
 * Toolbox category shown while the ThingBot device is selected. The resource-pack toolbox contract
 * carries block types only.
 */
import type { ToolboxCategory } from '../../../shared/types'

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'ThingBot',
  colour: '#42CCFF',
  contents: [
    { kind: 'block', type: 'thingBotC3_init' },
    { kind: 'block', type: 'thingBotC3_setMotor', inputs: { SPEED: { type: 'math_number', fields: { NUM: 0 } } } },
    { kind: 'block', type: 'thingBotC3_setServo', inputs: { PULSE: { type: 'math_number', fields: { NUM: 0 } } } },
    { kind: 'block', type: 'thingBotC3_buzzer', inputs: { SOUND: { type: 'math_number', fields: { NUM: 0 } } } },
    { kind: 'block', type: 'thingBotC3_setTempo', inputs: { TEMPO: { type: 'math_number', fields: { NUM: 120 } } } },
    { kind: 'block', type: 'thingBotC3_playNote', inputs: { BEATS: { type: 'math_number', fields: { NUM: 1 } } } },
    { kind: 'block', type: 'thingBotC3_rest', inputs: { BEATS: { type: 'math_number', fields: { NUM: 1 } } } },
    { kind: 'block', type: 'thingBotC3_setLed', inputs: { BRIGHTNESS: { type: 'math_number', fields: { NUM: 0 } } } },
    { kind: 'block', type: 'thingBotC3_switch' },
    { kind: 'block', type: 'thingBotC3_initPS2' },
  ],
}

export default toolbox
