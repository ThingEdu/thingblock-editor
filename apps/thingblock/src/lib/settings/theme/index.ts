import { defineMessages } from 'react-intl'

export const DEFAULT_THEME = 'default'
export const CAT_BLOCKS_THEME = 'cat-blocks'

export type Theme = typeof DEFAULT_THEME | typeof CAT_BLOCKS_THEME

const messages = defineMessages({
  [DEFAULT_THEME]: {
    id: 'gui.blockTheme.default',
    defaultMessage: 'Default',
    description: 'label for default theme',
  },
  [CAT_BLOCKS_THEME]: {
    id: 'gui.blockTheme.catBlocks',
    defaultMessage: 'Cat Blocks',
    description: 'label for cat blocks theme',
  },
})

// Keeping this as a map for consistency with the color modes
export const themeMap = {
  [DEFAULT_THEME]: {
    label: messages[DEFAULT_THEME],
    isAvailable: () => true,
  },
  [CAT_BLOCKS_THEME]: {
    label: messages[CAT_BLOCKS_THEME],
    isAvailable: () => true,
  },
}
