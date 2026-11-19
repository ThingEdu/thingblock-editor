import { type ColorMode, DEFAULT_MODE, getColorsForMode } from '.'
import type { CategoryInfo } from '../../blocks/make-toolbox-xml'

/**
 * @param mode The color mode.
 * @returns The colors of every extension's blocks in that mode.
 */
export const getExtensionColors = (mode: ColorMode) => getColorsForMode(mode).pen

/**
 * Colors extension categories for a color mode. The default mode changes nothing, so extensions keep their own
 * colors there.
 * @param dynamicBlockXML Each extension category's XML, as the VM runtime's `getBlocksXML` returns it.
 * @param mode The color mode.
 * @returns The categories, recolored.
 */
export const injectExtensionCategoryMode = (dynamicBlockXML: CategoryInfo[], mode: ColorMode): CategoryInfo[] => {
  if (mode === DEFAULT_MODE) return dynamicBlockXML

  const extensionColors = getExtensionColors(mode)
  const parser = new DOMParser()
  const serializer = new XMLSerializer()

  return dynamicBlockXML.map((extension) => {
    const dom = parser.parseFromString(extension.xml, 'text/xml')

    // Blockly reads the UK spelling of "colour".
    dom.documentElement.setAttribute('colour', extensionColors.colourPrimary)
    // The category's secondaryColour matches the blocks' tertiary color; both are the border color.
    dom.documentElement.setAttribute('secondaryColour', extensionColors.colourTertiary)

    return {
      ...extension,
      xml: serializer.serializeToString(dom),
    }
  })
}
