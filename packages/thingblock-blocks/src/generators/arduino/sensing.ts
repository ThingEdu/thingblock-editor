/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ArduinoGenerator } from '../arduino'
import { Order } from './order'

/**
 * Register Arduino generators for the sensing blocks that survive into board
 * mode. Only the timer blocks remain in the board-mode palette — Scratch's timer
 * is seconds since the last `reset timer`, which maps onto the board's `millis()`. The
 * host-only sensing blocks (mouse, keyboard, ask/answer, clock, online) are
 * hidden in board mode and intentionally have no firmware generator.
 * @param gen The Arduino generator to register on.
 */
export function registerSensing(gen: ArduinoGenerator): void {
  // The timer counts from `scratchTimerStart`, which `reset timer` moves to now; it starts at 0, so
  // until a reset the timer is the board's uptime. The prefix keeps it clear of the ESP32 core's own
  // `timerStart()`.
  const declareTimerStart = () => gen.globals.set('sensing_timer_start', 'unsigned long scratchTimerStart = 0;')
  gen.forBlock.sensing_timer = () => {
    declareTimerStart()
    return ['(millis() - scratchTimerStart) / 1000.0', Order.MULTIPLICATIVE]
  }
  gen.forBlock.sensing_resettimer = () => {
    declareTimerStart()
    return 'scratchTimerStart = millis();\n'
  }
}
