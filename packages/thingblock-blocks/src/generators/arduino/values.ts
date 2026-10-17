/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ArduinoGenerator } from '../arduino'
import { Order } from './order'

/**
 * Register Arduino generators for the built-in literal (shadow) blocks that fill
 * value inputs: numbers, text, and list-index menus.
 * @param gen The Arduino generator to register on.
 */
export function registerValues(gen: ArduinoGenerator): void {
  const number = (block: { getFieldValue(name: string): unknown }): [string, Order] => {
    const raw = Number(block.getFieldValue('NUM'))
    return [Number.isFinite(raw) ? String(raw) : '0', Order.ATOMIC]
  }

  gen.forBlock.math_number = number
  gen.forBlock.math_integer = number
  gen.forBlock.math_whole_number = number
  gen.forBlock.math_positive_number = number

  // The picker's field is a CSS `#rrggbb` string; Arduino code wants the same 24-bit value as a
  // hex literal, which is what the LED-strip libraries take.
  gen.forBlock.colour_picker = (block) => {
    const raw = String(block.getFieldValue('COLOUR') ?? '#000000')
    return [`0x${raw.replace(/^#/, '')}`, Order.ATOMIC]
  }

  gen.forBlock.text = (block, generator) => [
    generator.quote_(String(block.getFieldValue('TEXT') ?? '')),
    Order.ATOMIC,
  ]

  gen.forBlock.data_listindexall = (block, generator) => [
    generator.quote_(String(block.getFieldValue('INDEX') ?? 'all')),
    Order.ATOMIC,
  ]
  gen.forBlock.data_listindexrandom = (block, generator) => [
    generator.quote_(String(block.getFieldValue('INDEX') ?? 'random')),
    Order.ATOMIC,
  ]
}
