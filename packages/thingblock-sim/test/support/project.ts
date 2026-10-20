/**
 * A tiny builder for sb3 projects in tests: write the block stacks as nested calls and get the
 * `project.json` a `.tb` file would hold, with the same input and field encoding the editor saves.
 */
import type { Sb3Project } from '../../src/headless'

type Ref = string | unknown[]

interface BlockSpec {
  opcode: string
  inputs?: Record<string, Ref | Ref[] | Stack>
  fields?: Record<string, [unknown, string?]>
  proccode?: string
}

/** A statement stack: the specs of its blocks, top to bottom. */
export class Stack {
  readonly blocks: BlockSpec[]
  constructor(blocks: BlockSpec[]) {
    this.blocks = blocks
  }
}

export const num = (value: number | string): unknown[] => [4, String(value)]
export const txt = (value: string): unknown[] => [10, value]
export const stack = (...blocks: BlockSpec[]) => new Stack(blocks)
export const block = (
  opcode: string,
  inputs: BlockSpec['inputs'] = {},
  fields: BlockSpec['fields'] = {},
): BlockSpec => ({
  opcode,
  inputs,
  fields,
})

export class ProjectBuilder {
  private readonly blocks: Record<string, unknown> = {}
  private readonly variables: Record<string, [string, number]> = {}
  private readonly variableTypes: Record<string, string> = {}
  private next = 0

  /**
   * Declare a variable and return a reporter for it.
   * @param name The name the blocks show.
   * @param type The C++ type the variable is declared with.
   * @returns The variable reporter primitive.
   */
  variable(name: string, type: 'int' | 'float' | 'string' = 'int'): unknown[] {
    const id = `var-${name}`
    this.variables[id] = [name, 0]
    this.variableTypes[id] = type
    return [12, name, id]
  }

  /**
   * The VARIABLE field of a set/change block for a declared variable.
   * @param variable The reporter `variable()` returned.
   * @returns The field's name and id.
   */
  field(variable: unknown[]): [unknown, string] {
    return [variable[1], variable[2] as string]
  }

  /**
   * A reporter block, returned as a reference to plug into an input.
   * @param spec The block to add.
   * @returns The new block's id.
   */
  reporter(spec: BlockSpec): string {
    return this.add(spec, null)
  }

  hat(opcode: string, body: Stack): void {
    const id = this.id()
    const first = this.chain(body, id)
    this.blocks[id] = { opcode, next: first, parent: null, inputs: {}, fields: {}, topLevel: true }
  }

  project(): Sb3Project {
    return {
      targets: [
        { isStage: true, variables: this.variables, variableTypes: this.variableTypes, blocks: {} },
        { isStage: false, variables: {}, blocks: this.blocks as Sb3Project['targets'][0]['blocks'] },
      ],
    }
  }

  private id(): string {
    return `b${this.next++}`
  }

  private chain(body: Stack, parent: string | null): string | null {
    let previous: string | null = null
    let first: string | null = null
    for (const spec of body.blocks) {
      const id = this.add(spec, previous ?? parent)
      if (previous) (this.blocks[previous] as { next: string | null }).next = id
      else first = id
      previous = id
    }
    return first
  }

  private add(spec: BlockSpec, parent: string | null): string {
    const id = this.id()
    const inputs: Record<string, unknown> = {}
    for (const [name, value] of Object.entries(spec.inputs ?? {})) {
      if (value instanceof Stack) inputs[name] = [2, this.chain(value, id)]
      else inputs[name] = [3, value]
    }
    this.blocks[id] = {
      opcode: spec.opcode,
      next: null,
      parent,
      inputs,
      fields: spec.fields ?? {},
      topLevel: false,
      ...(spec.proccode ? { mutation: { proccode: spec.proccode } } : {}),
    }
    return id
  }
}
