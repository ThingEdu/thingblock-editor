/** Toolbox category for the SSD1306 OLED display peripheral. */
import type { ShadowSpec, ToolboxCategory } from '../../../shared/types'

const whole = (num: number) => ({ type: 'math_whole_number', fields: { NUM: num } })

/**
 * Shadow-fill a block's coordinate inputs.
 * @param names The value-input names to fill.
 * @param overrides Per-input default values; any input not listed defaults to 0.
 * @returns The inputs map for a toolbox block entry.
 */
const coords = (names: string[], overrides: Record<string, number> = {}) =>
  Object.fromEntries(names.map((name) => [name, whole(overrides[name] ?? 0)])) as Record<string, ShadowSpec>

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'OLED',
  colour: '#C0C0C0',
  contents: [
    { kind: 'block', type: 'oled_init', inputs: coords(['W', 'H'], { W: 128, H: 64 }) },
    {
      kind: 'block',
      type: 'oled_drawLine',
      inputs: coords(['X0', 'Y0', 'X1', 'Y1'], { X1: 32, Y1: 32 }),
    },
    { kind: 'block', type: 'oled_drawRect', inputs: coords(['X', 'Y', 'W', 'H'], { W: 32, H: 16 }) },
    { kind: 'block', type: 'oled_fillRect', inputs: coords(['X', 'Y', 'W', 'H'], { W: 32, H: 16 }) },
    { kind: 'block', type: 'oled_drawCircle', inputs: coords(['X', 'Y', 'R'], { R: 8 }) },
    { kind: 'block', type: 'oled_fillCircle', inputs: coords(['X', 'Y', 'R'], { R: 8 }) },
    {
      kind: 'block',
      type: 'oled_drawRoundRect',
      inputs: coords(['X', 'Y', 'W', 'H', 'R'], { W: 32, H: 16, R: 4 }),
    },
    {
      kind: 'block',
      type: 'oled_fillRoundRect',
      inputs: coords(['X', 'Y', 'W', 'H', 'R'], { W: 32, H: 16, R: 4 }),
    },
    {
      kind: 'block',
      type: 'oled_drawTriangle',
      inputs: coords(['X0', 'Y0', 'X1', 'Y1', 'X2', 'Y2'], { X1: 32, Y1: 32, X2: 16 }),
    },
    {
      kind: 'block',
      type: 'oled_fillTriangle',
      inputs: coords(['X0', 'Y0', 'X1', 'Y1', 'X2', 'Y2'], { X1: 32, Y1: 32, X2: 16 }),
    },
    { kind: 'block', type: 'oled_setText' },
    { kind: 'block', type: 'oled_setCursor', inputs: coords(['X', 'Y']) },
    { kind: 'block', type: 'oled_print', inputs: { DATA: { type: 'text', fields: { TEXT: '' } } } },
    { kind: 'block', type: 'oled_clear' },
    { kind: 'block', type: 'oled_refresh' },
    { kind: 'block', type: 'oled_startScroll' },
    { kind: 'block', type: 'oled_stopScroll' },
  ],
}

export default toolbox
