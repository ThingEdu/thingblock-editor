/**
 * One simulation run as the editor drives it: load a generated program onto a fresh ThingBot, then run
 * it in slices of real time at a chosen speed, pause it, or step it a block at a time. Each slice
 * returns a snapshot of what the rig shows. The session holds no timers of its own, so the same code
 * runs in a Web Worker (paced by the worker's ticks) and in tests (paced by hand).
 */
import { createBoard, type Board } from './board'
import { compileProgram } from './headless'
import { Runner, type LogEntry, type Phase } from './runtime'

export interface Snapshot {
  /** Virtual time, in microseconds. */
  t: number
  phase: Phase
  running: boolean
  /** The block that ran last, for the editor to highlight. */
  block: string | undefined
  /** Why the program halted, when it did. */
  error: string | undefined
  /** PCA9685 duty per channel, out of 4096. */
  pwm: number[]
  /** The OLED's shown frame (page layout), or null when the program has no display. */
  oled: { width: number; height: number; frame: Uint8Array } | null
  /** Serial text printed since the previous snapshot. */
  serial: string
  /** The last tick ran out of real time before reaching the virtual time it was asked for. */
  behind: boolean
}

export interface SessionOptions {
  /** Real-time clock in milliseconds; injectable for tests. */
  now?: () => number
}

/**
 * Real time one tick may spend running the program. On a NEO One a statement-dense loop at 100x cannot
 * keep up; the budget keeps each tick short so the worker stays responsive, and the program then runs
 * slower than asked (`behind`) instead of stalling the panel.
 */
const TICK_BUDGET_MS = 8
/** Statements between two looks at the real-time clock. */
const SLICE_STEPS = 2_000

export class Session {
  speed = 1
  running = false
  private behind = false
  private readonly now: () => number
  private board: Board
  private runner: Runner
  private logCursor = 0
  /**
   * The log, for the checker and for tests.
   * @returns Every entry the board has recorded.
   */
  get log(): readonly LogEntry[] {
    return this.board.log.entries
  }

  constructor(code: string, options: SessionOptions = {}) {
    this.now = options.now ?? (() => performance.now())
    this.board = createBoard()
    this.runner = new Runner(compileProgram<Board['$']>(code)(this.board.$), this.board.clock, this.board.log)
  }

  /**
   * Run for `realMs` of wall-clock time at the current speed, if running.
   * @param realMs Wall-clock milliseconds since the previous tick.
   * @returns What the rig shows now.
   */
  tick(realMs: number): Snapshot {
    if (this.running) {
      const target = this.board.clock.now + realMs * 1000 * this.speed
      const start = this.now()
      while (this.board.clock.now < target && this.runner.phase !== 'halted') {
        this.runner.runUntil(target, SLICE_STEPS)
        if (this.now() - start >= TICK_BUDGET_MS) break
      }
      this.behind = this.board.clock.now < target && this.runner.phase !== 'halted'
      if (this.runner.phase === 'halted') this.running = false
    }
    return this.snapshot()
  }

  /**
   * Run one block and stop.
   * @returns What the rig shows now.
   */
  step(): Snapshot {
    this.running = false
    this.runner.stepBlock()
    return this.snapshot()
  }

  /**
   * Drive an input: `gpio3` 0 presses the ThingBot switch, 1 releases it.
   * @param key The input, e.g. `gpio3` or `adc4`.
   * @param value The level or reading to apply.
   */
  setInput(key: string, value: number): void {
    this.board.setInput(key, value)
  }

  snapshot(): Snapshot {
    const entries = this.board.log.entries
    let serial = ''
    for (; this.logCursor < entries.length; this.logCursor++) {
      const entry = entries[this.logCursor]
      if (entry.dev === 'serial') serial += String(entry.value)
    }
    const { pwm, oled } = this.board.devices
    return {
      t: this.board.clock.now,
      phase: this.runner.phase,
      running: this.running,
      block: this.runner.currentBlock,
      error: this.runner.error,
      pwm: pwm ? [...pwm.duty] : new Array<number>(16).fill(0),
      oled: oled ? { width: oled.width, height: oled.height, frame: oled.getShownFrame() } : null,
      serial,
      behind: this.behind,
    }
  }
}
