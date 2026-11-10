// Load a saved project's blocks into a headless Blockly workspace so the Arduino generator can run on
// it without the editor (no DOM). The generators read blocks only by opcode, input name and field
// name, so each opcode is defined from how the project itself uses it instead of loading the editor's
// block definitions. Variables are created with their ids, names and `variableTypes` before any block,
// so the generator declares `float`/`String` variables with their real type and real name.

/** sb3 primitive array type codes (`[type, value, id?]`) and the shadow block each stands for. */
const PRIMITIVES = {
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

const isStatementInput = (name) => /^SUBSTACK\d*$/.test(name)
const isHat = (opcode) => opcode.startsWith('event_when') || opcode === 'procedures_definition'

/**
 * Build a headless workspace holding every block of every target of a project.
 * @param {typeof import('blockly/core')} Blockly The Blockly module the generator was built against.
 * @param {object} project The parsed `project.json`.
 * @returns {import('blockly/core').Workspace} A workspace holding the project's blocks, ready to generate.
 */
export function loadHeadlessWorkspace(Blockly, project) {
  const workspace = new Blockly.Workspace()
  const blocks = {}
  for (const target of project.targets) {
    for (const [id, [name]] of Object.entries(target.variables)) {
      const model = workspace.getVariableMap().createVariable(name, '', id)
      const declared = target.variableTypes?.[id]
      if (declared === 'float' || declared === 'string') model.dataType = declared
    }
    for (const [id, [name]] of Object.entries(target.lists ?? {}))
      workspace.getVariableMap().createVariable(name, 'list', id)
    for (const [id, block] of Object.entries(target.blocks)) {
      if (!Array.isArray(block)) blocks[id] = block
    }
  }

  defineShapes(Blockly, blocks)

  const created = new Map()
  const primitive = (value) => {
    const kind = PRIMITIVES[value[0]]
    if (!kind) return null
    const block = workspace.newBlock(kind.opcode)
    // A variable or list primitive carries the name then the id; the generators look variables up by id.
    block.setFieldValue(String(kind.opcode.startsWith('data_') ? value[2] : value[1]), kind.field)
    return block
  }
  const resolveRef = (ref) => {
    if (ref === null || ref === undefined) return null
    if (Array.isArray(ref)) return primitive(ref)
    return created.get(ref) ?? null
  }

  for (const [id, block] of Object.entries(blocks)) {
    const node = workspace.newBlock(block.opcode, id)
    if (block.mutation?.proccode !== undefined) node.data = block.mutation.proccode
    for (const [name, [value, valueId]] of Object.entries(block.fields)) {
      node.setFieldValue(String(name === 'VARIABLE' || name === 'LIST' ? valueId : value), name)
    }
    created.set(id, node)
  }

  for (const [id, block] of Object.entries(blocks)) {
    const parent = created.get(id)
    for (const [name, input] of Object.entries(block.inputs)) {
      const child = resolveRef(input[1]) ?? resolveRef(input[2])
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
 * @param {typeof import('blockly/core')} Blockly The Blockly module to define on.
 * @param {Record<string, object>} blocks The project's blocks by id.
 */
function defineShapes(Blockly, blocks) {
  const shapes = new Map()
  const shape = (opcode) => {
    if (!shapes.has(opcode)) shapes.set(opcode, { fields: new Set(), inputs: new Map(), output: false })
    return shapes.get(opcode)
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
        if (typeof ref === 'string' && ref in blocks) shape(blocks[ref].opcode).output = true
      }
    }
  }

  for (const [opcode, s] of shapes) {
    const args = [
      ...[...s.fields].map((name) => ({ type: 'field_input', name, text: '' })),
      ...[...s.inputs].map(([name, kind]) => ({
        type: kind === 'statement' ? 'input_statement' : 'input_value',
        name,
      })),
    ]
    const json = { message0: args.map((_, i) => `%${i + 1}`).join(' ') || opcode, args0: args }
    if (s.output) json.output = null
    else {
      if (!isHat(opcode)) json.previousStatement = null
      json.nextStatement = null
    }
    Blockly.Blocks[opcode] = {
      init() {
        this.jsonInit(json)
      },
      getProcCode() {
        return this.data ?? ''
      },
    }
  }
}
