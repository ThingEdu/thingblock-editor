/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Block } from 'blockly/core'
import { Order } from '../arduino/order'
import { numericText } from '../cpp-types'
import { literalType, type CType, type SimGenerator } from '../sim'

const isNumeric = (type: CType): boolean => type !== 'String' && type !== 'cstr'

/**
 * Register simulator generators for the built-in blocks the Arduino generator handles: literals,
 * variables, control, operators, timer and procedures. Each mirrors the Arduino generator's C++ (see
 * `../arduino/*`) with JavaScript that computes the same values.
 * @param gen The simulator generator to register on.
 */
export function registerSimCore(gen: SimGenerator): void {
  const t = gen.typeFor
  const atomic = (code: string): [string, number] => [code, Order.ATOMIC]

  // --- Literals ---------------------------------------------------------------------------------
  const numberLiteral = (block: Block): string => {
    const raw = Number(block.getFieldValue('NUM'))
    return Number.isFinite(raw) ? String(raw) : '0'
  }
  for (const type of ['math_number', 'math_integer', 'math_whole_number', 'math_positive_number']) {
    gen.forBlock[type] = (block) => atomic(numberLiteral(block))
    t[type] = (block) => literalType(numberLiteral(block))
  }
  gen.forBlock.text = (block, generator) => atomic(generator.quote_(String(block.getFieldValue('TEXT') ?? '')))
  t.text = () => 'cstr'
  gen.forBlock.colour_picker = (block) => atomic(`0x${String(block.getFieldValue('COLOUR') ?? '#000000').slice(1)}`)
  t.colour_picker = () => 'int'

  // --- Variables --------------------------------------------------------------------------------
  const variable = (generator: SimGenerator, block: Block): { name: string; type: CType } => {
    const id = String(block.getFieldValue('VARIABLE'))
    const name = generator.getVariableName(id)
    const type = generator.variableType(block, id)
    generator.globals.set(`var_${name}`, `let ${name} = ${type === 'String' ? '""' : '0'};`)
    return { name, type }
  }

  gen.forBlock.data_variable = (block, generator) => atomic(variable(generator, block).name)
  t.data_variable = (block, generator) => generator.variableType(block, String(block.getFieldValue('VARIABLE')))

  gen.forBlock.data_setvariableto = (block, generator) => {
    const { name, type } = variable(generator, block)
    // The set block's shadow is text: for a numeric variable the Arduino generator writes a numeric
    // text as a bare literal, and anything else as 0.
    const valueBlock = block.getInputTargetBlock('VALUE')
    if (type !== 'String' && valueBlock?.type === 'text') {
      const literal = numericText(valueBlock.getFieldValue('TEXT')) ?? '0'
      return `${name} = ${generator.convert(block, literal, literalType(literal), type)};`
    }
    return `${name} = ${generator.inputAs(block, 'VALUE', type, type === 'String' ? '""' : '0')};`
  }

  gen.forBlock.data_changevariableby = (block, generator) => {
    const { name, type } = variable(generator, block)
    const value = generator.typedInput(block, 'VALUE')
    if (type === 'String') return `${name} = ${name} + ${generator.convert(block, value.code, value.type, 'String')};`
    // `x += v` computes in the common type of x and v, then converts back to x's type.
    return `${name} = ${generator.convert(block, arithmetic('+', name, value.code, generator.promote(type, value.type)), generator.promote(type, value.type), type)};`
  }

  for (const type of ['data_showvariable', 'data_hidevariable', 'data_showlist', 'data_hidelist']) {
    gen.forBlock[type] = () => ''
  }

  // --- Control ----------------------------------------------------------------------------------
  const condition = (generator: SimGenerator, block: Block): string => {
    const { code, type } = generator.typedInput(block, 'CONDITION', 'false', 'bool')
    if (!isNumeric(type)) generator.fail(block, 'Điều kiện phải là đúng/sai hoặc một số.')
    return code
  }
  // Each loop pass yields its own block id, so even an empty loop hands control back to the runner.
  const body = (generator: SimGenerator, block: Block, input = 'SUBSTACK') =>
    `${generator.INDENT}yield ${generator.quote_(block.id)};\n${generator.statementToCode(block, input)}`

  gen.forBlock.control_if = (block, generator) =>
    `if (${condition(generator, block)}) {\n${generator.statementToCode(block, 'SUBSTACK')}\n}`
  gen.forBlock.control_if_else = (block, generator) =>
    `if (${condition(generator, block)}) {\n${generator.statementToCode(block, 'SUBSTACK')}\n} else {\n${generator.statementToCode(block, 'SUBSTACK2')}\n}`
  gen.forBlock.control_forever = (block, generator) => `while (true) {\n${body(generator, block)}\n}`
  gen.forBlock.control_repeat = (block, generator) => {
    // C++ re-evaluates `i < times` on every pass, so `times` stays an expression here too.
    const times = generator.typedInput(block, 'TIMES')
    const i = generator.nextLoopVar()
    return `for (let ${i} = 0; ${i} < ${times.code}; ${i} = $.i32(${i} + 1)) {\n${body(generator, block)}\n}`
  }
  gen.forBlock.control_repeat_until = (block, generator) =>
    `while (!(${condition(generator, block)})) {\n${body(generator, block)}\n}`
  gen.forBlock.control_while = (block, generator) =>
    `while (${condition(generator, block)}) {\n${body(generator, block)}\n}`
  gen.forBlock.control_all_at_once = (block, generator) => generator.statementToCode(block, 'SUBSTACK')

  // C++: `delay(duration * 1000)`, the product computed in the duration's type.
  gen.forBlock.control_wait = (block, generator) => {
    const duration = generator.typedInput(block, 'DURATION')
    const type = generator.promote(duration.type, 'int')
    return `yield $.delay(${arithmetic('*', duration.code, '1000', type)});`
  }
  gen.forBlock.control_wait_until = (block, generator) =>
    `while (!(${condition(generator, block)})) {\n${generator.INDENT}yield $.delay(16);\n}`
  // `return;` from setup() or loop() is what the C++ does too: loop() then starts over.
  gen.forBlock.control_stop = () => 'return;'

  gen.forBlock.control_print = (block, generator) => {
    const { code, type } = generator.typedInput(block, 'STRING', '""', 'cstr')
    return `$.Serial.println(${generator.printable(code, type)});`
  }

  // --- Operators --------------------------------------------------------------------------------
  /**
   * A binary arithmetic operator computed in C++ type `type`.
   * @param op One of + - * /.
   * @param a Left operand code.
   * @param b Right operand code.
   * @param type The common type of the operands.
   * @returns The expression.
   */
  function arithmetic(op: string, a: string, b: string, type: CType): string {
    if (type === 'double') return `(${a} ${op} ${b})`
    if (type === 'float') return `Math.fround(${a} ${op} ${b})`
    if (op === '*') return `$.imul(${a}, ${b})`
    if (op === '/') return `$.idiv(${a}, ${b})`
    return `$.i32(${a} ${op} ${b})`
  }

  const binary = (op: string) => {
    const type = (block: Block, generator: SimGenerator) =>
      generator.promote(
        generator.typeOf(block.getInputTargetBlock('NUM1')),
        generator.typeOf(block.getInputTargetBlock('NUM2')),
      )
    return {
      code: (block: Block, generator: SimGenerator): [string, number] => {
        const a = generator.typedInput(block, 'NUM1')
        const b = generator.typedInput(block, 'NUM2')
        if (!isNumeric(a.type) || !isNumeric(b.type)) {
          generator.fail(block, 'Phép tính này cần hai số.')
          return atomic('0')
        }
        return atomic(arithmetic(op, a.code, b.code, type(block, generator)))
      },
      type,
    }
  }
  for (const [opcode, op] of [
    ['operator_add', '+'],
    ['operator_subtract', '-'],
    ['operator_multiply', '*'],
    ['operator_divide', '/'],
  ] as const) {
    const { code, type } = binary(op)
    gen.forBlock[opcode] = code
    t[opcode] = type
  }

  gen.forBlock.operator_mod = (block, generator) => {
    const n = generator.typedInput(block, 'NUM1')
    const m = generator.typedInput(block, 'NUM2', '1')
    if (generator.promote(n.type, m.type) !== 'int') {
      generator.fail(block, 'Phép chia lấy dư chỉ dùng được với số nguyên.')
      return atomic('0')
    }
    // C++: `((n % m) + m) % m`.
    return atomic(`$.imod($.i32($.imod(${n.code}, ${m.code}) + ${m.code}), ${m.code})`)
  }
  t.operator_mod = () => 'int'

  /**
   * One side of a comparison, as the Arduino generator writes it: a numeric text literal is a bare
   * number unless the other side is a String variable.
   * @param generator The generator emitting the comparison.
   * @param block The comparison whose operand this is.
   * @param name The operand input to generate.
   * @param sibling The other operand input, which decides whether a numeric text stays a string.
   * @returns The operand's code and C++ type.
   */
  const comparisonOperand = (generator: SimGenerator, block: Block, name: string, sibling: string) => {
    const target = block.getInputTargetBlock(name)
    if (target?.type === 'text') {
      const literal = numericText(target.getFieldValue('TEXT'))
      const other = block.getInputTargetBlock(sibling)
      const otherIsString =
        other?.type === 'data_variable' &&
        generator.variableType(block, String(other.getFieldValue('VARIABLE'))) === 'String'
      if (literal !== null && !otherIsString) return { code: literal, type: literalType(literal) }
    }
    return generator.typedInput(block, name)
  }
  const comparison = (op: string) => (block: Block, generator: SimGenerator) => {
    const a = comparisonOperand(generator, block, 'OPERAND1', 'OPERAND2')
    const b = comparisonOperand(generator, block, 'OPERAND2', 'OPERAND1')
    if (isNumeric(a.type) !== isNumeric(b.type)) {
      generator.fail(block, 'Không so sánh được một số với một chuỗi chữ.')
      return atomic('false')
    }
    if (isNumeric(a.type)) return atomic(`(${a.code} ${op} ${b.code})`)
    return atomic(`(String(${a.code}) ${op} String(${b.code}))`)
  }
  gen.forBlock.operator_lt = comparison('<')
  gen.forBlock.operator_gt = comparison('>')
  gen.forBlock.operator_equals = comparison('==')
  for (const opcode of [
    'operator_lt',
    'operator_gt',
    'operator_equals',
    'operator_and',
    'operator_or',
    'operator_not',
  ]) {
    t[opcode] = () => 'bool'
  }

  // JavaScript `&&` yields an operand, not a bool; C++ yields a bool.
  const truth = (generator: SimGenerator, block: Block, name: string) =>
    `!!${generator.typedInput(block, name, 'false', 'bool').code}`
  gen.forBlock.operator_and = (block, generator) =>
    atomic(`(${truth(generator, block, 'OPERAND1')} && ${truth(generator, block, 'OPERAND2')})`)
  gen.forBlock.operator_or = (block, generator) =>
    atomic(`(${truth(generator, block, 'OPERAND1')} || ${truth(generator, block, 'OPERAND2')})`)
  gen.forBlock.operator_not = (block, generator) =>
    atomic(`!${generator.typedInput(block, 'OPERAND', 'false', 'bool').code}`)

  // `random(from, to + 1)` on the core's 32-bit long.
  gen.forBlock.operator_random = (block, generator) =>
    atomic(
      `$.random(${generator.inputAs(block, 'FROM', 'int')}, $.i32(${generator.inputAs(block, 'TO', 'int', '1')} + 1))`,
    )
  t.operator_random = () => 'int'

  // `round()` is std::round: a double, so `print` shows two decimals.
  gen.forBlock.operator_round = (block, generator) => atomic(`$.round(${generator.inputAs(block, 'NUM', 'double')})`)
  t.operator_round = () => 'double'

  const MATH: Record<string, string> = {
    floor: 'Math.floor',
    ceiling: 'Math.ceil',
    sqrt: 'Math.sqrt',
    sin: 'Math.sin',
    cos: 'Math.cos',
    tan: 'Math.tan',
    asin: 'Math.asin',
    acos: 'Math.acos',
    atan: 'Math.atan',
    ln: 'Math.log',
    log: 'Math.log10',
    'e ^': 'Math.exp',
  }
  const mathOperator = (block: Block) => String(block.getFieldValue('OPERATOR') ?? 'abs').toLowerCase()
  gen.forBlock.operator_mathop = (block, generator) => {
    const op = mathOperator(block)
    // std::abs keeps an int an int; every other function computes in double.
    if (op === 'abs') {
      const { code, type } = generator.typedInput(block, 'NUM')
      return atomic(type === 'int' ? `$.i32(Math.abs(${code}))` : `Math.abs(${code})`)
    }
    const arg = generator.inputAs(block, 'NUM', 'double')
    if (op === '10 ^') return atomic(`Math.pow(10, ${arg})`)
    return atomic(`${MATH[op] ?? 'Math.abs'}(${arg})`)
  }
  t.operator_mathop = (block, generator) => {
    if (mathOperator(block) !== 'abs') return 'double'
    return generator.typeOf(block.getInputTargetBlock('NUM')) === 'int' ? 'int' : 'double'
  }

  // --- Sensing ----------------------------------------------------------------------------------
  gen.forBlock.sensing_timer = () => atomic('($.millis() / 1000.0)')
  t.sensing_timer = () => 'double'
  gen.forBlock.sensing_resettimer = () => ''

  // --- Procedures -------------------------------------------------------------------------------
  gen.forBlock.procedures_call = (block, generator) => {
    const procCode = (block as unknown as { getProcCode(): string }).getProcCode()
    return `yield* ${generator.getProcedureName(procCode)}();`
  }
}
