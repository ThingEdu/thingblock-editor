/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import type { Block, Workspace } from 'blockly/core'
import { Order } from './arduino/order'
import { variableCppType } from './cpp-types'
import { registerSimCore } from './sim/core'

/**
 * The C++ type of a generated expression. The simulator computes with JavaScript numbers, so the
 * generator tracks what C++ would have: an `int` wraps and divides by truncation, a `float` rounds to
 * single precision, `print` formats a `double` with two decimals and an `int` with none.
 */
export type CType = 'int' | 'float' | 'double' | 'bool' | 'String' | 'cstr' | 'char'

/** A problem that would stop the Arduino build: the simulator refuses to run what the board cannot. */
export interface SimDiagnostic {
  blockId: string
  message: string
}

const NUMERIC: readonly CType[] = ['bool', 'char', 'int', 'float', 'double']

/** JavaScript words and runtime names a generated identifier must never take. */
const RESERVED_WORDS = [
  'arguments,await,break,case,catch,class,const,continue,debugger,default,delete,do,else,enum,eval,export,',
  'extends,false,finally,for,function,if,implements,import,in,instanceof,interface,let,new,null,package,',
  'private,protected,public,return,static,super,switch,this,throw,true,try,typeof,var,void,while,with,yield,',
  'Math,String,Number,Infinity,NaN,undefined,setup,loop,$,',
].join('')

/**
 * The C++ type of a numeric literal as the Arduino generator writes it: with a decimal point or an
 * exponent it is a `double`, otherwise an `int`.
 * @param literal The literal's source text.
 * @returns 'double' or 'int'.
 */
export const literalType = (literal: string): CType =>
  /[.eE]/.test(literal) && !/^0x/i.test(literal) ? 'double' : 'int'

/**
 * Simulator code generator: the same blocks as the Arduino generator, emitted as JavaScript generator
 * functions that run on `@thingblock/thingblock-sim`. It mirrors the Arduino generator's output call for
 * call — the hardware packs call the same library methods on the simulator's virtual devices — and
 * tracks the C++ type of every expression, so arithmetic, conversions and printing behave as the
 * compiled sketch would.
 *
 * Generated code runs against one argument, `$`, the simulator board's scope (`$.delay`, `$.millis`,
 * `$.hw.Adafruit_SSD1306`, the C++ value helpers). Before each statement it yields the block's id, so
 * the runner can highlight it, single-step it, and charge it virtual time; `delay()` becomes
 * `yield $.delay(ms)`, which sleeps in virtual time instead of blocking the page.
 */
export class SimGenerator extends Blockly.CodeGenerator {
  /** File-scope declarations (device objects, variables, helper functions), keyed so duplicates collapse. */
  readonly globals = new Map<string, string>()
  /** Statements to run once at the top of `setup()`, keyed so duplicates collapse. */
  readonly setups = new Map<string, string>()
  /** Reporter types, one function per block type, as `forBlock` holds one per block's code. */
  readonly typeFor: Record<string, (block: Block, generator: SimGenerator) => CType> = {}
  /** Build errors found in the last pass. */
  readonly diagnostics: SimDiagnostic[] = []
  private repeatCount = 0

  constructor() {
    super('Sim')
    this.addReservedWords(RESERVED_WORDS)
    registerSimCore(this)
  }

  nextLoopVar(): string {
    return `i${this.repeatCount++}`
  }

  quote_(value: string): string {
    return JSON.stringify(String(value))
  }

  /**
   * The C++ type of the expression a reporter block produces.
   * @param block The reporter block, or null for an empty input (which the generators fill with `0`).
   * @returns The block's C++ type.
   */
  typeOf(block: Block | null): CType {
    if (!block) return 'int'
    const typeFor = this.typeFor[block.type] as (typeof this.typeFor)[string] | undefined
    if (!typeFor) {
      console.warn(`SimGenerator.typeOf: no type for reporter "${block.type}" (block ${block.id}); assuming double`)
      return 'double'
    }
    return typeFor(block, this)
  }

  /**
   * The C++ type a variable is declared with.
   * @param block A block referencing the variable.
   * @param variableId Which variable, as the block's VARIABLE field stores it.
   * @returns 'int' | 'float' | 'String'.
   */
  variableType(block: Block, variableId: string): CType {
    return variableCppType(block, variableId)
  }

  /**
   * Record a build error against a block; the program will not be run.
   * @param block The offending block.
   * @param message What the compiler would reject, in the learner's terms.
   */
  fail(block: Block, message: string): void {
    this.diagnostics.push({ blockId: block.id, message })
  }

  /**
   * The code and C++ type of a value input.
   * @param block The block owning the input.
   * @param name The value input to read.
   * @param fallback Code for an empty input.
   * @param fallbackType The C++ type of `fallback`.
   * @returns The input's code and type.
   */
  typedInput(block: Block, name: string, fallback = '0', fallbackType: CType = 'int'): { code: string; type: CType } {
    const target = block.getInputTargetBlock(name)
    const code = this.valueToCode(block, name, Order.NONE)
    if (!target || !code) return { code: fallback, type: fallbackType }
    return { code: `(${code})`, type: this.typeOf(target) }
  }

  /**
   * A value input converted the way C++ converts it into a parameter or variable of type `to`.
   * @param block The block owning the input.
   * @param name The value input to read.
   * @param to The C++ type the value lands in.
   * @param fallback Code for an empty input.
   * @returns The converted code.
   */
  inputAs(block: Block, name: string, to: CType, fallback = '0'): string {
    const { code, type } = this.typedInput(block, name, fallback, to === 'String' || to === 'cstr' ? 'cstr' : 'int')
    return this.convert(block, code, type, to)
  }

  /**
   * C++ implicit conversion of `code` from type `from` to type `to`.
   * @param block The block the conversion belongs to, for diagnostics.
   * @param code The expression.
   * @param from Its C++ type.
   * @param to The target C++ type.
   * @returns The converted expression.
   */
  convert(block: Block, code: string, from: CType, to: CType): string {
    if (from === to) return code
    const fromNumber = NUMERIC.includes(from)
    if (to === 'String' || to === 'cstr') {
      if (from === 'String' || from === 'cstr') return code
      if (to === 'cstr') {
        this.fail(block, 'Cần một chuỗi chữ ở đây, không dùng được số.')
        return '""'
      }
      return this.printable(code, from)
    }
    if (!fromNumber) {
      this.fail(block, 'Cần một số ở đây, không dùng được chuỗi chữ.')
      return '0'
    }
    if (to === 'int' || to === 'char')
      return from === 'float' || from === 'double' ? `$.toInt(${code})` : `(+${code})`
    if (to === 'float') return `Math.fround(${code})`
    if (to === 'bool') return `(${code} != 0)`
    return `(+${code})`
  }

  /**
   * An expression formatted as `Print::print` (and `String(x)`) formats its C++ type.
   * @param code The expression.
   * @param type Its C++ type.
   * @returns JavaScript code producing the printed text.
   */
  printable(code: string, type: CType): string {
    switch (type) {
      case 'int':
        return `$.printInt(${code})`
      case 'float':
      case 'double':
        return `$.printFloat(${code})`
      case 'bool':
        return `$.printBool(${code})`
      case 'char':
        return `String.fromCharCode(${code})`
      default:
        return `String(${code})`
    }
  }

  /**
   * The usual arithmetic conversions: the type both operands of a binary operator convert to.
   * @param a The left operand's type.
   * @param b The right operand's type.
   * @returns The common type.
   */
  promote(a: CType, b: CType): CType {
    if (a === 'double' || b === 'double') return 'double'
    if (a === 'float' || b === 'float') return 'float'
    return 'int'
  }

  init(workspace: Workspace): void {
    super.init(workspace)
    this.globals.clear()
    this.setups.clear()
    this.diagnostics.length = 0
    this.repeatCount = 0
    if (!this.nameDB_) this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_)
    else this.nameDB_.reset()
    this.nameDB_.setVariableMap(workspace.getVariableMap())
    this.nameDB_.populateVariables(workspace)
  }

  /**
   * Generate the program body for a workspace: the source of a function of `$` that returns
   * `{ setup, loop }`.
   * @param workspace The workspace to generate from.
   * @returns The function body.
   */
  workspaceToCode(workspace?: Workspace): string {
    if (!workspace) throw new Error('SimGenerator.workspaceToCode requires a workspace')
    this.init(workspace)

    let setupCode = ''
    let loopCode = ''
    for (const hat of workspace.getTopBlocks(true)) {
      if (hat.type === 'procedures_definition') {
        this.emitProcedureDefinition(hat)
        continue
      }
      const stack = hat.getNextBlock()
      if (!stack) continue
      if (hat.type === 'event_whenarduinobegin') setupCode += this.blockToCodeString(stack)
      else if (hat.type === 'event_whenarduinoloop' || hat.type === 'event_whenflagclicked') {
        loopCode += this.blockToCodeString(stack)
      }
    }

    const setupBody = [...this.setups.values(), setupCode].filter((line) => line.length > 0).join('\n')
    const sections = [
      ...this.globals.values(),
      `function* setup() {\n${setupBody ? `${this.prefixLines(setupBody, this.INDENT)}\n` : ''}}`,
      `function* loop() {\n${loopCode ? `${this.prefixLines(loopCode, this.INDENT)}\n` : ''}}`,
      'return { setup, loop };',
    ]
    return `${sections.join('\n\n')}\n`
  }

  private emitProcedureDefinition(hat: Block): void {
    const prototype = hat.getInputTargetBlock('custom_block') as { getProcCode?: () => string } | null
    const name = this.getProcedureName(prototype?.getProcCode?.() ?? 'custom_block')
    const next = hat.getNextBlock()
    const body = next ? this.blockToCodeString(next) : ''
    const indented = body ? `${this.prefixLines(body, this.INDENT)}\n` : ''
    this.globals.set(`proc_${name}`, `function* ${name}() {\n${indented}}`)
  }

  /**
   * Prefix every statement with a yield of its block id, then append the rest of the stack.
   * @param block The current block.
   * @param code The code generated for `block`.
   * @param thisOnly When true, do not append the next block.
   * @returns The block's code, followed by the rest of its stack.
   */
  scrub_(block: Block, code: string, thisOnly = false): string {
    const own = block.outputConnection ? code : `yield ${this.quote_(block.id)};\n${code}`
    const next = block.nextConnection?.targetBlock()
    if (next && !thisOnly) return `${own}\n${this.blockToCodeString(next)}`
    return own
  }

  blockToCodeString(block: Block): string {
    const code = this.blockToCode(block)
    return typeof code === 'string' ? code : code[0]
  }
}

/** The shared simulator generator, with all built-in block generators registered. */
export const simGenerator = new SimGenerator()
