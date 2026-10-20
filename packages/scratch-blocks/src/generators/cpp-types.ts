/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Block } from 'blockly/core'

/** A variable model carrying Scratch's optional explicit value type. */
interface ScratchVariable {
  dataType?: string
}

/** The C++ type a Scratch variable is declared with in the generated sketch. */
export type VariableCppType = 'int' | 'float' | 'String'

/**
 * The C++ type to declare a variable with, from its Scratch data type. Shared by the Arduino generator,
 * which declares it, and the simulator generator, which has to compute with the same type.
 * @param block A block referencing the variable (for its workspace).
 * @param variableId The variable's id (from a `field_variable`).
 * @returns 'int' | 'float' | 'String'.
 */
export function variableCppType(block: Block, variableId: string): VariableCppType {
  // dataType is a Scratch extension on the variable model; default to int.
  const model = block.workspace.getVariableMap().getVariableById(variableId) as ScratchVariable | null
  if (model?.dataType === 'string') return 'String'
  if (model?.dataType === 'float') return 'float'
  return 'int'
}

/**
 * A learner's text that reads as a number, trimmed, or null. The generators emit such text as a bare
 * C++ numeric literal where a number is expected (a comparison operand, a numeric variable's `set`).
 * @param raw The text field's value.
 * @returns The trimmed numeric text, or null when it is not a finite number.
 */
export function numericText(raw: unknown): string | null {
  const text = String(raw ?? '').trim()
  return text !== '' && Number.isFinite(Number(text)) ? text : null
}
