/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Block } from 'blockly/core'
import { numericText } from './cpp-types'

/** One parameter of a custom block. */
export interface ProcedureArg {
  /** The input name on a call block (the argument id). */
  id: string
  /** The name the learner gave it, which its argument reporters show. */
  name: string
  /** A `%b` (boolean) parameter; `%s` parameters are numbers in firmware. */
  boolean: boolean
}

interface ProcedureState {
  procCode_?: string
  argumentIds_?: string[]
  displayNames_?: string[]
}

/**
 * The parameters of a custom block, in order, read from its prototype or a call to it. Call blocks carry
 * no display names; their `name` is the id.
 * @param block A `procedures_prototype` or `procedures_call` block.
 * @returns Its parameters.
 */
export function procedureArgs(block: Block | null): ProcedureArg[] {
  const state = (block ?? {}) as ProcedureState
  const kinds = (state.procCode_ ?? '').match(/(?<!\\)%[sbn]/g) ?? []
  return (state.argumentIds_ ?? []).map((id, i) => ({
    id,
    name: state.displayNames_?.[i] ?? id,
    boolean: kinds[i] === '%b',
  }))
}

/**
 * A numeric argument given as a typed-in text (the call's default shadow is text): its number, or null
 * when the input holds anything else.
 * @param block The call block.
 * @param id The argument's input name.
 * @returns The bare numeric literal, `0` for non-numeric text, or null for a non-text input.
 */
export function textArgumentAsNumber(block: Block, id: string): string | null {
  const target = block.getInputTargetBlock(id)
  if (target?.type !== 'text') return null
  return numericText(target.getFieldValue('TEXT')) ?? '0'
}
