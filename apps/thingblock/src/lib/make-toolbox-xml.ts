import * as ScratchBlocks from '@thingblock/thingblock-blocks'
import { type BlockColors, defaultColors } from './settings/color-mode'

type CategoryColors = BlockColors['event']

/** XML for an extension or core category, which replaces the built-in one with the same id. */
export interface CategoryInfo {
  id: string
  xml: string
}

const translate = (id: string, defaultMessage: string): string =>
  String(ScratchBlocks.ScratchMsgs.translate(id, defaultMessage, undefined))

const categorySeparator = '<sep gap="36"/>'

const blockSeparator = '<sep gap="36"/>' // At default scale, about 28px

export const xmlEscape = function (unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return c
    }
  })
}

const events = function (colors: CategoryColors, boardMode: boolean) {
  // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
  return `
    <category name="${translate('CATEGORY_EVENTS', 'Events')}" toolboxitemid="events" colour="${
      colors.colourPrimary
    }" secondaryColour="${colors.colourTertiary}">
        ${
          boardMode
            ? `
        <block type="event_whenarduinobegin"/>
        <block type="event_whenarduinoloop"/>
        `
            : `
        <block type="event_whenflagclicked"/>
        <block type="event_whenkeypressed">
        </block>
        `
        }
        ${categorySeparator}
    </category>
    `
}

const control = function (colors: CategoryColors, boardMode: boolean) {
  // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
  // In board mode, the host-only print block is hidden; it has no board equivalent.
  return `
    <category
        name="${translate('CATEGORY_CONTROL', 'Control')}"
        toolboxitemid="control"
        colour="${colors.colourPrimary}"
        secondaryColour="${colors.colourTertiary}">
        <block type="control_wait">
            <value name="DURATION">
                <shadow type="math_positive_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="control_repeat">
            <value name="TIMES">
                <shadow type="math_whole_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        <block id="forever" type="control_forever"/>
        ${blockSeparator}
        <block type="control_if"/>
        <block type="control_if_else"/>
        <block id="wait_until" type="control_wait_until"/>
        <block id="repeat_until" type="control_repeat_until"/>
        ${blockSeparator}
        <block type="control_stop"/>
        ${
          boardMode
            ? ''
            : `
        ${blockSeparator}
        <block type="control_print">
            <value name="STRING">
                <shadow type="text">
                    <field name="TEXT">Hello!</field>
                </shadow>
            </value>
        </block>
        `
        }
        ${categorySeparator}
    </category>
    `
}

const sensing = function (isInitialSetup: boolean, colors: CategoryColors, boardMode: boolean) {
  const name = translate('SENSING_ASK_TEXT', "What's your name?")
  // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
  // In board mode, host-only blocks (mouse, keyboard, ask/answer, clock, online) are hidden; only the
  // timer blocks remain because they map to millis() on the board. sensing_timer/resettimer stay in both.
  return `
    <category
        name="${translate('CATEGORY_SENSING', 'Sensing')}"
        toolboxitemid="sensing"
        colour="${colors.colourPrimary}"
        secondaryColour="${colors.colourTertiary}">
        ${
          boardMode
            ? ''
            : `
        ${
          isInitialSetup
            ? ''
            : `
            <block id="askandwait" type="sensing_askandwait">
                <value name="QUESTION">
                    <shadow type="text">
                        <field name="TEXT">${name}</field>
                    </shadow>
                </value>
            </block>
        `
        }
        <block id="answer" type="sensing_answer"/>
        ${blockSeparator}
        <block type="sensing_keypressed">
            <value name="KEY_OPTION">
                <shadow type="sensing_keyoptions"/>
            </value>
        </block>
        <block type="sensing_mousedown"/>
        <block type="sensing_mousex"/>
        <block type="sensing_mousey"/>
        ${blockSeparator}
        `
        }
        <block id="timer" type="sensing_timer"/>
        <block type="sensing_resettimer"/>
        ${
          boardMode
            ? ''
            : `
        ${blockSeparator}
        <block id="current" type="sensing_current"/>
        <block type="sensing_dayssince2000"/>
        ${blockSeparator}
        <block id="online" type="sensing_online" />
        `
        }
        ${categorySeparator}
    </category>
    `
}

const operators = function (isInitialSetup: boolean, colors: CategoryColors) {
  const apple = translate('OPERATORS_JOIN_APPLE', 'apple')
  const banana = translate('OPERATORS_JOIN_BANANA', 'banana')
  const letter = translate('OPERATORS_LETTEROF_APPLE', 'a')
  // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
  return `
    <category
        name="${translate('CATEGORY_OPERATORS', 'Operators')}"
        toolboxitemid="operators"
        colour="${colors.colourPrimary}"
        secondaryColour="${colors.colourTertiary}">
        <block type="operator_add">
            <value name="NUM1">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
            <value name="NUM2">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        <block type="operator_subtract">
            <value name="NUM1">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
            <value name="NUM2">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        <block type="operator_multiply">
            <value name="NUM1">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
            <value name="NUM2">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        <block type="operator_divide">
            <value name="NUM1">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
            <value name="NUM2">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="operator_random">
            <value name="FROM">
                <shadow type="math_number">
                    <field name="NUM">1</field>
                </shadow>
            </value>
            <value name="TO">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="operator_gt">
            <value name="OPERAND1">
                <shadow type="text">
                    <field name="TEXT"/>
                </shadow>
            </value>
            <value name="OPERAND2">
                <shadow type="text">
                    <field name="TEXT">50</field>
                </shadow>
            </value>
        </block>
        <block type="operator_lt">
            <value name="OPERAND1">
                <shadow type="text">
                    <field name="TEXT"/>
                </shadow>
            </value>
            <value name="OPERAND2">
                <shadow type="text">
                    <field name="TEXT">50</field>
                </shadow>
            </value>
        </block>
        <block type="operator_equals">
            <value name="OPERAND1">
                <shadow type="text">
                    <field name="TEXT"/>
                </shadow>
            </value>
            <value name="OPERAND2">
                <shadow type="text">
                    <field name="TEXT">50</field>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="operator_and"/>
        <block type="operator_or"/>
        <block type="operator_not"/>
        ${blockSeparator}
        ${
          isInitialSetup
            ? ''
            : `
            <block type="operator_join">
                <value name="STRING1">
                    <shadow type="text">
                        <field name="TEXT">${apple} </field>
                    </shadow>
                </value>
                <value name="STRING2">
                    <shadow type="text">
                        <field name="TEXT">${banana}</field>
                    </shadow>
                </value>
            </block>
            <block type="operator_letter_of">
                <value name="LETTER">
                    <shadow type="math_whole_number">
                        <field name="NUM">1</field>
                    </shadow>
                </value>
                <value name="STRING">
                    <shadow type="text">
                        <field name="TEXT">${apple}</field>
                    </shadow>
                </value>
            </block>
            <block type="operator_length">
                <value name="STRING">
                    <shadow type="text">
                        <field name="TEXT">${apple}</field>
                    </shadow>
                </value>
            </block>
            <block type="operator_contains" id="operator_contains">
              <value name="STRING1">
                <shadow type="text">
                  <field name="TEXT">${apple}</field>
                </shadow>
              </value>
              <value name="STRING2">
                <shadow type="text">
                  <field name="TEXT">${letter}</field>
                </shadow>
              </value>
            </block>
        `
        }
        ${blockSeparator}
        <block type="operator_mod">
            <value name="NUM1">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
            <value name="NUM2">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        <block type="operator_round">
            <value name="NUM">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="operator_mathop">
            <value name="NUM">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        ${blockSeparator}
        <block type="operator_tonumber">
            <value name="VALUE">
                <shadow type="text">
                    <field name="TEXT">0</field>
                </shadow>
            </value>
        </block>
        <block type="operator_totext">
            <value name="VALUE">
                <shadow type="math_number">
                    <field name="NUM"/>
                </shadow>
            </value>
        </block>
        ${categorySeparator}
    </category>
    `
}

const variables = function (colors: CategoryColors) {
  // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
  return `
    <category
        name="${translate('CATEGORY_VARIABLES', 'Variables')}"
        toolboxitemid="variables"
        colour="${colors.colourPrimary}"
        secondaryColour="${colors.colourTertiary}"
        custom="VARIABLE">
    </category>
    `
}

const myBlocks = function (colors: CategoryColors) {
  // Note: the category's secondaryColour matches up with the blocks' tertiary color, both used for border color.
  return `
    <category
        name="${translate('CATEGORY_MYBLOCKS', 'My Blocks')}"
        toolboxitemid="myBlocks"
        colour="${colors.colourPrimary}"
        secondaryColour="${colors.colourTertiary}"
        custom="PROCEDURE">
    </category>
    `
}

const xmlOpen = '<xml style="display: none">'
const xmlClose = '</xml>'

/**
 * Builds the toolbox XML.
 * @param isInitialSetup - Whether the toolbox is for initial setup. If so, blocks with localized default
 *     parameters (e.g. ask and wait) are left out (LLK/scratch-gui#5445).
 * @param categoriesXML - Core and extension categories. Core ones replace the built-in category in the normal
 *     order; others go at the bottom.
 * @param colors - The colors for the color mode.
 * @param boardMode - Whether a board is selected. In board mode, host-only core blocks (mouse, keyboard,
 *     ask/answer, clock, online) are hidden from the palette.
 * @returns A ScratchBlocks-style XML document for the contents of the toolbox.
 */
const makeToolboxXML = function (
  isInitialSetup: boolean,
  categoriesXML: CategoryInfo[] = [],
  colors: BlockColors = defaultColors,
  boardMode = false,
) {
  const gap = [categorySeparator]

  categoriesXML = categoriesXML.slice()
  // Removes the category from categoriesXML and returns its XML
  const moveCategory = (categoryId: string) => {
    const index = categoriesXML.findIndex((categoryInfo) => categoryInfo.id === categoryId)
    if (index >= 0) {
      const [categoryInfo] = categoriesXML.splice(index, 1)
      return categoryInfo.xml
    }
  }
  const eventsXML = moveCategory('event') ?? events(colors.event, boardMode)
  const controlXML = moveCategory('control') ?? control(colors.control, boardMode)
  const sensingXML = moveCategory('sensing') ?? sensing(isInitialSetup, colors.sensing, boardMode)
  const operatorsXML = moveCategory('operators') ?? operators(isInitialSetup, colors.operators)
  const variablesXML = moveCategory('data') ?? variables(colors.data)
  const myBlocksXML = moveCategory('procedures') ?? myBlocks(colors.more)

  const everything = [
    xmlOpen,
    eventsXML,
    gap,
    controlXML,
    gap,
    sensingXML,
    gap,
    operatorsXML,
    gap,
    variablesXML,
    gap,
    myBlocksXML,
  ]

  for (const extensionCategory of categoriesXML) {
    everything.push(gap, extensionCategory.xml)
  }

  everything.push(xmlClose)
  return everything.join('\n')
}

export default makeToolboxXML
