/**
 * Pack block translations. A pack's blocks are written in English (`message0`, tooltips, dropdown
 * labels); a pack ships `locales/<lang>.json` keyed by opcode, and `withTranslations` swaps those in
 * when a block is created while the editor's blocks locale (`ScratchMsgs`) is that language. Blocks are
 * created again when the learner switches language, so they follow the switch. Dropdown values, the
 * code generators and saved projects never change.
 */
import type { Blockly, RegisterBlocks } from './types'

export interface BlockTranslation {
  /** The block text, with the same `%1`, `%2`… as the English. */
  message0?: string
  tooltip?: string
  /** Dropdown labels by field name, then by option value. */
  options?: Record<string, Record<string, string>>
}

/** Translations by language, then by opcode. */
export type PackTranslations = Record<string, Record<string, BlockTranslation>>

interface BlockJson {
  message0?: string
  tooltip?: string
  args0?: { name?: string; options?: unknown }[]
  [key: string]: unknown
}

const placeholders = (text: string): string =>
  [...text.matchAll(/%\d+/g)]
    .map((m) => m[0])
    .sort()
    .join(' ')

/**
 * The block definition with one language's text swapped in. A translated message whose `%n` set differs
 * from the English is ignored, so a bad translation can never drop an input.
 * @param json The block's English definition.
 * @param tr The translation.
 * @returns The translated definition.
 */
export function translateJson(json: BlockJson, tr: BlockTranslation): BlockJson {
  const out: BlockJson = { ...json }
  if (tr.message0 && json.message0 && placeholders(tr.message0) === placeholders(json.message0)) {
    out.message0 = tr.message0
  }
  if (tr.tooltip && json.tooltip) out.tooltip = tr.tooltip
  const labels = tr.options
  if (labels && json.args0) {
    out.args0 = json.args0.map((arg) => {
      const byValue = arg.name ? labels[arg.name] : undefined
      if (!byValue || !Array.isArray(arg.options)) return arg
      const options = (arg.options as [string, string][]).map(([label, value]): [string, string] => [
        byValue[value] ?? label,
        value,
      ])
      return { ...arg, options }
    })
  }
  return out
}

/**
 * Wrap a pack's block registration so its blocks are created in the editor's language.
 * @param register The pack's registration.
 * @param translations The pack's translations.
 * @returns A registration that also installs the translations.
 */
export function withTranslations(register: RegisterBlocks, translations: PackTranslations): RegisterBlocks {
  return (blockly: Blockly) => {
    register(blockly)
    const msgs = (blockly as unknown as { ScratchMsgs?: { currentLocale_?: string } }).ScratchMsgs
    const opcodes = new Set(Object.values(translations).flatMap((table) => Object.keys(table)))
    const blocks = blockly.Blocks as Record<string, { init?: (this: BlockThis) => void }>
    for (const opcode of opcodes) {
      const def = blocks[opcode] as { init?: (this: BlockThis) => void } | undefined
      const init = def?.init
      if (!def || !init) continue
      def.init = function (this: BlockThis) {
        const table = translations[msgs?.currentLocale_ ?? 'en'] as Record<string, BlockTranslation> | undefined
        const tr = table?.[opcode]
        if (!tr) {
          init.call(this)
          return
        }
        const jsonInit = this.jsonInit
        this.jsonInit = (json: BlockJson) => jsonInit.call(this, translateJson(json, tr))
        try {
          init.call(this)
        } finally {
          // Back to the prototype's method.
          delete (this as Partial<BlockThis>).jsonInit
        }
      }
    }
  }
}

interface BlockThis {
  jsonInit: (json: BlockJson) => void
}
