/**
 * Run a saved project without the editor: load a `.tb` project's blocks into a headless Blockly
 * workspace, ready for the simulator generator. This is what the checker and the parity tests use in
 * CI, where there is no page to render the editor in.
 *
 * The generators read blocks only by opcode, input name and field name, so each opcode is defined here
 * from how the project itself uses it, instead of loading the editor's block definitions (which need a
 * DOM to render). The block id is preserved, so a block marker in the generated code names the block
 * the editor would highlight.
 */
import type * as BlocklyModule from 'blockly/core'
import type { Program } from './runtime'

type Blockly = typeof BlocklyModule
type Workspace = BlocklyModule.Workspace
type Block = BlocklyModule.Block

/** An sb3 input: `[shadowState, block, shadow?]`, each slot a block id or a primitive array. */
type Sb3Input = [number, string | unknown[] | null, (string | unknown[] | null)?]

interface Sb3Block {
  opcode: string
  next: string | null
  parent: string | null
  inputs: Record<string, Sb3Input>
  fields: Record<string, [unknown, (string | null)?]>
  topLevel: boolean
  mutation?: { proccode?: string }
}

interface Sb3Target {
  isStage: boolean
  variables: Record<string, [string, unknown]>
  lists?: Record<string, [string, unknown[]]>
  variableTypes?: Record<string, string>
  blocks: Record<string, Sb3Block | unknown[]>
}

export interface Sb3Project {
  targets: Sb3Target[]
}

/** sb3 primitive array type codes (`[type, value, id?]`) and the shadow block each stands for. */
const PRIMITIVES: Record<number, { opcode: string; field: string }> = {
  4: { opcode: 'math_number', field: 'NUM' },
  5: { opcode: 'math_positive_number', field: 'NUM' },
  6: { opcode: 'math_whole_number', field: 'NUM' },
  7: { opcode: 'math_integer', field: 'NUM' },
  8: { opcode: 'math_angle', field: 'NUM' },
  9: { opcode: 'colour_picker', field: 'COLOUR' },
  10: { opcode: 'text', field: 'TEXT' },
  12: { opcode: 'data_variable', field: 'VARIABLE' },
  13: { opcode: 'data_listcontents', field: 'LIST' },
}

const isStatementInput = (name: string): boolean => /^SUBSTACK\d*$/.test(name)
const isHat = (opcode: string): boolean => opcode.startsWith('event_when') || opcode === 'procedures_definition'

interface Shape {
  fields: Set<string>
  inputs: Map<string, 'value' | 'statement'>
  output: boolean
}

/**
 * Build a headless workspace from a project's blocks.
 * @param Blockly The Blockly module to build with (the caller's instance, so generators registered on it apply).
 * @param project The parsed `project.json` of a `.tb` file.
 * @returns The workspace holding every block of every target.
 */
export function loadProject(Blockly: Blockly, project: Sb3Project): Workspace {
  const workspace = new Blockly.Workspace()
  const blocks: Record<string, Sb3Block> = {}
  for (const target of project.targets) {
    for (const [id, [name]] of Object.entries(target.variables)) {
      const model = workspace.createVariable(name, '', id) as unknown as { dataType?: string }
      const declared = target.variableTypes?.[id]
      if (declared === 'float' || declared === 'string') model.dataType = declared
    }
    for (const [id, [name]] of Object.entries(target.lists ?? {})) workspace.createVariable(name, 'list', id)
    for (const [id, block] of Object.entries(target.blocks)) {
      // A top-level primitive (a loose variable reporter) is an array; nothing generates from it.
      if (!Array.isArray(block)) blocks[id] = block
    }
  }

  defineShapes(Blockly, blocks)

  const created = new Map<string, Block>()
  const primitive = (value: unknown[]): Block | null => {
    const kind = PRIMITIVES[value[0] as number]
    if (!kind) return null
    const block = workspace.newBlock(kind.opcode)
    // A variable or list primitive carries the name then the id; the generators look variables up by id.
    block.setFieldValue(String(kind.opcode.startsWith('data_') ? value[2] : value[1]), kind.field)
    return block
  }
  const resolve = (ref: string | unknown[] | null | undefined): Block | null => {
    if (ref === null || ref === undefined) return null
    if (Array.isArray(ref)) return primitive(ref)
    return created.get(ref) ?? null
  }

  for (const [id, block] of Object.entries(blocks)) {
    const created_ = workspace.newBlock(block.opcode, id)
    if (block.mutation?.proccode !== undefined) created_.data = block.mutation.proccode
    for (const [name, [value, valueId]] of Object.entries(block.fields)) {
      created_.setFieldValue(String(name === 'VARIABLE' || name === 'LIST' ? valueId : value), name)
    }
    created.set(id, created_)
  }

  for (const [id, block] of Object.entries(blocks)) {
    const parent = created.get(id) as Block
    for (const [name, input] of Object.entries(block.inputs)) {
      const child = resolve(input[1]) ?? resolve(input[2])
      const connection = parent.getInput(name)?.connection
      if (!child || !connection) continue
      const childConnection = isStatementInput(name) ? child.previousConnection : child.outputConnection
      if (childConnection) connection.connect(childConnection)
    }
    const next = block.next ? created.get(block.next) : undefined
    if (next?.previousConnection && parent.nextConnection) parent.nextConnection.connect(next.previousConnection)
  }
  return workspace
}

/**
 * Define every opcode the project uses, shaped by how the project uses it: its fields, its value and
 * statement inputs, and whether it plugs into a value input (a reporter) or stacks (a statement).
 * @param Blockly The Blockly module to define on.
 * @param blocks The project's blocks by id.
 */
function defineShapes(Blockly: Blockly, blocks: Record<string, Sb3Block>): void {
  const shapes = new Map<string, Shape>()
  const shape = (opcode: string): Shape => {
    let s = shapes.get(opcode)
    if (!s) {
      s = { fields: new Set(), inputs: new Map(), output: false }
      shapes.set(opcode, s)
    }
    return s
  }

  for (const kind of Object.values(PRIMITIVES)) {
    const s = shape(kind.opcode)
    s.fields.add(kind.field)
    s.output = true
  }
  for (const block of Object.values(blocks)) {
    const s = shape(block.opcode)
    for (const name of Object.keys(block.fields)) s.fields.add(name)
    for (const [name, input] of Object.entries(block.inputs)) {
      const statement = isStatementInput(name)
      s.inputs.set(name, statement ? 'statement' : 'value')
      if (statement) continue
      for (const ref of [input[1], input[2]]) {
        if (typeof ref === 'string' && blocks[ref]) shape(blocks[ref].opcode).output = true
      }
    }
  }

  for (const [opcode, s] of shapes) {
    const args: object[] = [
      ...[...s.fields].map((name) => ({ type: 'field_input', name, text: '' })),
      ...[...s.inputs].map(([name, kind]) => ({ type: kind === 'statement' ? 'input_statement' : 'input_value', name })),
    ]
    const json: Record<string, unknown> = {
      message0: args.map((_, i) => `%${i + 1}`).join(' ') || opcode,
      args0: args,
    }
    if (s.output) json.output = null
    else {
      if (!isHat(opcode)) json.previousStatement = null
      json.nextStatement = null
    }
    Blockly.Blocks[opcode] = {
      init(this: Block) {
        this.jsonInit(json)
      },
      /** The custom block's signature, which the procedure blocks carry in their mutation. */
      getProcCode(this: Block) {
        return this.data ?? ''
      },
    }
  }
}

/**
 * Turn generated simulator code into a program factory: the code is the body of a function of the
 * board scope `$`, returning `{ setup, loop }`.
 * @param code The simulator generator's output.
 * @returns A function that binds the program to a board scope.
 */
export function compileProgram<Scope>(code: string): (scope: Scope) => Program {
  // The code comes from the simulator generator, not from user text: it is the compiled program.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the generator's output is the program to run
  return new Function('$', code) as (scope: Scope) => Program
}
