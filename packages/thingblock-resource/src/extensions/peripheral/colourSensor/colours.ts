/**
 * What the colour sensor's blocks and both generators share: the raw channels, the colours it tells
 * apart, and the thresholds of the rules that name a colour (see `generator.ts`).
 */

/** Raw channels: the value is the index into the sensor's r, g, b, c readings. */
export const CHANNELS: [string, string][] = [
  ['red', '0'],
  ['green', '1'],
  ['blue', '2'],
  ['brightness', '3'],
]

/** The colours the sensor tells apart; the value is the code `colourSensorClass()` returns. */
export const COLOURS: [string, string][] = [
  ['red', '1'],
  ['green', '2'],
  ['blue', '3'],
  ['yellow', '4'],
  ['white', '5'],
  ['black', '0'],
]

/** The name each colour code reads as, indexed by the code. */
export const COLOUR_NAMES = ['đen', 'đỏ', 'xanh lá', 'xanh dương', 'vàng', 'trắng']

/** Clear-channel reading below which the surface counts as black. */
export const COLOUR_DARK = 400
/** Clear-channel reading from which an evenly lit surface counts as white. */
export const COLOUR_WHITE = 1500
/** How many percentage points apart red, green and blue may be and still count as even (white or black). */
export const COLOUR_EVEN = 12

/**
 * A colour block's code from its dropdown value, black for anything unknown.
 * @param value The `COLOUR` field value.
 * @returns The code, as source text.
 */
export const colourCode = (value: unknown): string =>
  COLOURS.some(([, code]) => code === String(value)) ? String(value) : '0'

/**
 * A channel block's index from its dropdown value, clamped to the four channels.
 * @param value The `CHANNEL` field value.
 * @returns 0…3.
 */
export const channelIndex = (value: unknown): number => Math.min(3, Math.max(0, Number(value) || 0))
