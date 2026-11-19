import defaultsDeep from 'lodash.defaultsdeep'
import { defineMessages } from 'react-intl'
import { blockColors as darkModeBlockColors, extensions as darkModeExtensions } from './dark'
import { type BlockColors, type PartialBlockColors, blockColors as defaultColors } from './default'
import defaultIcon from './default/icon.svg'
import { blockColors as highContrastBlockColors, extensions as highContrastExtensions } from './high-contrast'
import highContrastIcon from './high-contrast/icon.svg'

export const DEFAULT_MODE = 'default'
export const HIGH_CONTRAST_MODE = 'high-contrast'
export const DARK_MODE = 'dark'

export type ColorMode = typeof DEFAULT_MODE | typeof HIGH_CONTRAST_MODE | typeof DARK_MODE

const mergeWithDefaults = (colors: PartialBlockColors): BlockColors =>
  defaultsDeep({}, colors, defaultColors) as BlockColors

const messages = defineMessages({
  [DEFAULT_MODE]: {
    id: 'gui.theme.default',
    defaultMessage: 'Original',
    description: 'label for original color mode',
  },
  [DARK_MODE]: {
    id: 'gui.theme.dark',
    defaultMessage: 'Dark',
    description: 'label for dark mode',
  },
  [HIGH_CONTRAST_MODE]: {
    id: 'gui.theme.highContrast',
    defaultMessage: 'High Contrast',
    description: 'label for high contrast mode',
  },
})

export const colorModeMap = {
  [DEFAULT_MODE]: {
    blocksMediaFolder: 'blocks-media/default',
    colors: defaultColors,
    extensions: {},
    label: messages[DEFAULT_MODE],
    icon: defaultIcon,
  },
  [DARK_MODE]: {
    blocksMediaFolder: 'blocks-media/default',
    colors: mergeWithDefaults(darkModeBlockColors),
    extensions: darkModeExtensions,
    label: messages[DARK_MODE],
  },
  [HIGH_CONTRAST_MODE]: {
    blocksMediaFolder: 'blocks-media/high-contrast',
    colors: mergeWithDefaults(highContrastBlockColors),
    extensions: highContrastExtensions,
    label: messages[HIGH_CONTRAST_MODE],
    icon: highContrastIcon,
  },
}

/** The color modes the editor offers; dark mode is not offered yet. */
export const offeredColorModes = {
  [DEFAULT_MODE]: colorModeMap[DEFAULT_MODE],
  [HIGH_CONTRAST_MODE]: colorModeMap[HIGH_CONTRAST_MODE],
}

export const getColorsForMode = (colorMode: ColorMode): BlockColors => colorModeMap[colorMode].colors

/**
 * @param colorMode - Which mode's media.
 * @returns The path Blockly loads its media (icons, cursors, sounds) from in that mode, which `vite.config.mjs` serves.
 */
export const getBlocksMediaPath = (colorMode: ColorMode) => `static/${colorModeMap[colorMode].blocksMediaFolder}/`

export { defaultColors, type BlockColors }
