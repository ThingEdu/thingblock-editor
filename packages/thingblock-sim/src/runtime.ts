/**
 * The simulator's execution model. Generated programs are generator functions: `setup()` and `loop()`
 * yield a block id before each statement (so the editor can highlight and single-step it) and yield
 * `{ wait }` where the firmware would block in `delay()`. The runner drives them against a virtual
 * clock, so a program runs the same at 1×, 100× or as fast as the host allows, and a `forever` loop
 * cannot freeze the page: control returns to the runner at every statement.
 */

/** A block id: the statement about to run. */
export type Step = string

/** Sleep for `wait` microseconds of virtual time (`delay()` on the board). */
export interface Wait {
  wait: number
}

export type Yielded = Step | Wait

/** One generated routine (`setup` or `loop`), or a helper it delegates to with `yield*`. */
export type Routine = Generator<Yielded, void, void>

/** A generated program, as the code factory returns it. */
export interface Program {
  setup(): Routine
  loop(): Routine
}

/**
 * Virtual time charged for code the simulator cannot measure, in microseconds. Hardware calls charge
 * their own cost through the clock (an I2C transfer, a display refresh). These stay coarse on purpose:
 * the checker compares behaviour on the scale of milliseconds, and the C++ parity run charges the same
 * costs, so their exact values only move both logs together.
 */
export const COST = {
  /** One block's worth of work. */
  statement: 1,
  /** Returning from `setup()` or one pass of `loop()` back into the core's main loop. */
  loopReturn: 1,
}

/** Microsecond virtual clock. Only the runner and the hardware models move it. */
export class Clock {
  now = 0

  advance(us: number): void {
    this.now += us
  }

  /**
   * `millis()`: whole milliseconds since boot, as the 32-bit counter the core returns.
   * @returns The millisecond counter.
   */
  millis(): number {
    return Math.floor(this.now / 1000) >>> 0
  }

  /**
   * `micros()`: whole microseconds since boot, as a 32-bit counter.
   * @returns The microsecond counter.
   */
  micros(): number {
    return Math.floor(this.now) >>> 0
  }
}

export interface LogEntry {
  /** Virtual time in microseconds. */
  t: number
  /** The device that changed, e.g. `pca9685`, `oled`, `serial`, `board`. */
  dev: string
  /** What changed on it, e.g. `ch15`, `frame`. */
  key: string
  value: number | string
}

/**
 * What the virtual hardware did, in order: the record the checker grades and the parity run compares
 * against the C++ build. A value is recorded only when it differs from the last one under the same
 * device and key, so a program that rewrites the same LED level every millisecond logs it once.
 */
export class EventLog {
  readonly entries: LogEntry[] = []
  private readonly last = new Map<string, number | string>()
  private readonly clock: Clock

  constructor(clock: Clock) {
    this.clock = clock
  }

  record(dev: string, key: string, value: number | string): void {
    const slot = `${dev}\u0000${key}`
    if (this.last.get(slot) === value) return
    this.last.set(slot, value)
    this.entries.push({ t: this.clock.now, dev, key, value })
  }

  /**
   * Append an entry even when it repeats, for events rather than states (a byte sent on Serial).
   * @param dev The device the event happened on.
   * @param key What happened on it.
   * @param value The byte or reading it carried.
   */
  emit(dev: string, key: string, value: number | string): void {
    this.entries.push({ t: this.clock.now, dev, key, value })
  }
}

/**
 * A fault that resets the real board: an integer division by zero, say. The runner halts on it and logs
 * it rather than letting it escape, because it is the learner's bug to see, not the simulator's.
 */
export class BoardTrap extends Error {
  readonly reason: string

  constructor(reason: string) {
    super(reason)
    this.reason = reason
    this.name = 'BoardTrap'
  }
}

export type Phase = 'setup' | 'loop' | 'halted'

export class Runner {
  phase: Phase = 'setup'
  /** The block whose statement ran last, for highlighting. */
  currentBlock: Step | undefined
  /** Why the program halted, when a board trap stopped it. */
  error: string | undefined

  private readonly program: Program
  private readonly clock: Clock
  private readonly log: EventLog
  private routine: Routine
  /** Virtual time the program is sleeping until; at or before `clock.now` when it is runnable. */
  private resumeAt = 0

  constructor(program: Program, clock: Clock, log: EventLog) {
    this.program = program
    this.clock = clock
    this.log = log
    this.routine = program.setup()
  }

  /**
   * Run until virtual time reaches `target` (µs) or `maxSteps` statements have run, whichever comes
   * first. A sleep that ends after `target` leaves the clock at `target`, so the next call picks up
   * where this one stopped.
   * @param target The virtual time to stop at, in microseconds.
   * @param maxSteps Statement budget, so a caller on a frame deadline gets control back.
   * @returns How many statements ran.
   */
  runUntil(target: number, maxSteps = Infinity): number {
    let steps = 0
    while (this.phase !== 'halted' && steps < maxSteps) {
      if (this.resumeAt > this.clock.now) {
        if (this.resumeAt > target) {
          if (target > this.clock.now) this.clock.now = target
          break
        }
        this.clock.now = this.resumeAt
      }
      if (this.clock.now >= target) break
      if (this.pull()) steps++
    }
    return steps
  }

  /** Run to the next block marker, sleeping through any wait on the way (single-step). */
  stepBlock(): void {
    while (this.phase !== 'halted') {
      if (this.resumeAt > this.clock.now) this.clock.now = this.resumeAt
      if (this.pull()) return
    }
  }

  /**
   * Advance the program by one yield.
   * @returns True when it reached a block marker.
   */
  private pull(): boolean {
    let result: IteratorResult<Yielded, void>
    try {
      result = this.routine.next()
    } catch (e) {
      if (!(e instanceof BoardTrap)) throw e
      this.phase = 'halted'
      this.error = e.reason
      this.log.emit('board', 'trap', e.reason)
      return false
    }

    if (result.done) {
      this.phase = 'loop'
      this.routine = this.program.loop()
      this.clock.advance(COST.loopReturn)
      return false
    }
    if (typeof result.value === 'string') {
      this.currentBlock = result.value
      this.clock.advance(COST.statement)
      return true
    }
    this.resumeAt = this.clock.now + Math.max(0, result.value.wait)
    return false
  }
}
