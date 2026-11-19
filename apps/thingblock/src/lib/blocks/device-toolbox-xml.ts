import { type CategoryInfo, xmlEscape } from './make-toolbox-xml'

/** A shadow block that pre-fills a value input. */
interface ShadowSpec {
  type: string
  fields?: Record<string, string | number>
}

interface ToolboxItem {
  kind: string
}

interface ToolboxBlock extends ToolboxItem {
  kind: 'block'
  type: string
  /** Value-input name → shadow block. */
  inputs?: Record<string, ShadowSpec>
}

/** A resource pack's toolbox category, as `vm.devices.getActivePeripheralToolboxCategories()` returns it. */
export interface ToolboxCategory {
  kind: 'category'
  name: string
  colour?: string
  contents: (ToolboxBlock | ToolboxItem)[]
}

/**
 * Builds the `<value>` XML that plugs a shadow block into a named value input, so the palette block
 * carries an editable default field instead of an empty socket.
 * @param name The value-input name (matches the block's `input_value` name).
 * @param shadow The shadow block type and its field values.
 * @returns The `<value>` element wrapping the shadow.
 */
const shadowXML = (name: string, shadow: ShadowSpec) => {
  const fields = Object.entries(shadow.fields ?? {})
    .map(([fieldName, value]) => `<field name="${xmlEscape(fieldName)}">${xmlEscape(String(value))}</field>`)
    .join('')
  return `<value name="${xmlEscape(name)}"><shadow type="${xmlEscape(shadow.type)}">${fields}</shadow></value>`
}

/**
 * Builds the `<block>` XML for one toolbox block entry, nesting any shadow-filled value inputs.
 * @param item The pack's block entry.
 * @returns The `<block>` element.
 */
const blockXML = (item: ToolboxBlock) => {
  const inputs = item.inputs
    ? Object.entries(item.inputs)
        .map(([name, shadow]) => shadowXML(name, shadow))
        .join('')
    : ''
  return inputs
    ? `<block type="${xmlEscape(item.type)}">${inputs}</block>`
    : `<block type="${xmlEscape(item.type)}"/>`
}

/**
 * Converts a resource pack's toolbox category into the `{id, xml}` shape the toolbox builder appends. The pack
 * describes its palette as data; Blockly's toolbox is XML, so this is where the two meet.
 * @param category The palette category a resource pack contributes.
 * @param idPrefix The id namespace, e.g. `peripheral`, so pack categories never collide with each other or with
 *     the core category ids the toolbox builder reorders.
 * @returns The category id and its `<category>` XML.
 */
export const packCategoryToToolboxXML = (category: ToolboxCategory, idPrefix: string): CategoryInfo => {
  const id = `${idPrefix}_${category.name.toLowerCase().replace(/\s+/g, '_')}`
  const colour = category.colour ?? '#0FBD8C'
  const blocks = category.contents
    .filter((item): item is ToolboxBlock => item.kind === 'block')
    .map(blockXML)
    .join('')
  const xml = `<category name="${xmlEscape(category.name)}" toolboxitemid="${id}" colour="${colour}">${blocks}</category>`
  return { id, xml }
}
