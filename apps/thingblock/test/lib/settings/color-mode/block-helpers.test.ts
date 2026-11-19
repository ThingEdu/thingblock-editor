import { describe, expect, test } from 'vitest'
import { DARK_MODE, DEFAULT_MODE } from '../../../../src/lib/settings/color-mode'
import { injectExtensionCategoryMode } from '../../../../src/lib/settings/color-mode/block-helpers'

const dynamicBlockXML = [
  { id: 'pen', xml: '<category name="Pen" id="pen" colour="#0FBD8C" secondaryColour="#0DA57A"></category>' },
]

describe('injectExtensionCategoryMode', () => {
  test('colors extension categories for the color mode', () => {
    const [pen] = injectExtensionCategoryMode(dynamicBlockXML, DARK_MODE)
    const category = new DOMParser().parseFromString(pen.xml, 'text/xml').documentElement
    expect(category.getAttribute('colour')).toBe('#03251C')
    expect(category.getAttribute('secondaryColour')).toBe('#0fBD8C')
  })

  test('leaves the categories alone in the default mode', () => {
    expect(injectExtensionCategoryMode(dynamicBlockXML, DEFAULT_MODE)).toBe(dynamicBlockXML)
  })
})
