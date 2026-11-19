import * as ScratchBlocks from '@thingblock/thingblock-blocks'
import { type ColorMode, getColorsForMode } from '../settings/color-mode'

/**
 * @param colorMode - Which mode's colors.
 * @returns A Blockly theme with the mode's block colors.
 */
export const makeBlocksTheme = (colorMode: ColorMode) =>
  new ScratchBlocks.Theme(
    colorMode,
    // Blockly takes only block styles, but the mode's plain colors (`text`, `workspace` and the like) go in with them:
    // thingblock-blocks turns each into a CSS variable
    getColorsForMode(colorMode) as unknown as Record<string, Partial<ScratchBlocks.Theme.BlockStyle>>,
  )
