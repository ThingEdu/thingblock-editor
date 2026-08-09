/**
 * Toolbox category for the RGB LED strip peripheral. Colour inputs are pre-filled with the picker
 * shadow, whose Arduino codegen emits the `0xRRGGBB` literal the NeoPixel API takes.
 */
import type { ToolboxCategory } from '../../../shared/types'

const whole = (num: number) => ({ type: 'math_whole_number', fields: { NUM: num } })
const colour = { type: 'colour_picker' }

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'RGB LED Strip',
  colour: '#7700FF',
  contents: [
    { kind: 'block', type: 'rgbLedStrip_init', inputs: { LEN: whole(16) } },
    {
      kind: 'block',
      type: 'rgbLedStrip_setPixelColor',
      inputs: { NO: whole(1), COLOR: colour },
    },
    {
      kind: 'block',
      type: 'rgbLedStrip_fill',
      inputs: { FIRST: whole(1), COUNT: whole(2), COLOR: colour },
    },
    {
      kind: 'block',
      type: 'rgbLedStrip_color',
      inputs: { R: whole(255), G: whole(255), B: whole(255) },
    },
    { kind: 'block', type: 'rgbLedStrip_setBrightness', inputs: { BRT: whole(255) } },
    { kind: 'block', type: 'rgbLedStrip_clear' },
    { kind: 'block', type: 'rgbLedStrip_show' },
  ],
}

export default toolbox
