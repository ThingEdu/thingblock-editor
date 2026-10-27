import { describe, expect, it } from 'vitest'
import { BoardTrap, Clock, COST, EventLog, Runner, type Program, type Routine } from '../src/runtime'

const make = (program: Program) => {
  const clock = new Clock()
  const log = new EventLog(clock)
  return { clock, log, runner: new Runner(program, clock, log) }
}

describe('Runner', () => {
  it('runs setup once, then loop over and over, one statement cost per block marker', () => {
    const calls: string[] = []
    const { clock, runner } = make({
      *setup() {
        calls.push('setup')
        yield 'a'
      },
      *loop() {
        calls.push('loop')
        yield 'b'
      },
    })

    runner.runUntil(10)

    expect(calls.slice(0, 3)).toEqual(['setup', 'loop', 'loop'])
    expect(calls.filter((c) => c === 'setup')).toHaveLength(1)
    // Each loop pass costs one statement plus the return to the top of loop().
    expect(clock.now).toBe(10)
    expect(runner.phase).toBe('loop')
  })

  it('sleeps through a wait in virtual time and resumes exactly when it ends', () => {
    const seen: number[] = []
    const { clock, runner } = make({
      *setup() {
        // Nothing to set up.
      },
      *loop() {
        seen.push(clock.now)
        yield { wait: 1000 }
      },
    })

    runner.runUntil(2500)
    expect(clock.now).toBe(2500)
    expect(seen).toEqual([COST.loopReturn, 1000 + 2 * COST.loopReturn, 2000 + 3 * COST.loopReturn])

    runner.runUntil(5000)
    expect(seen).toHaveLength(5)
  })

  it('keeps virtual time moving through a loop that never yields, so a run always ends', () => {
    let passes = 0
    const { clock, runner } = make({
      *setup() {
        // Nothing to set up.
      },
      // eslint-disable-next-line require-yield -- the test needs a loop that never yields
      *loop() {
        passes++
      },
    })

    runner.runUntil(100)

    expect(clock.now).toBe(100)
    // Returning from setup() costs one return too, so one pass fewer fits.
    expect(passes).toBe(100 / COST.loopReturn - 1)
  })

  it('halts on a board trap and records it the way the board would reset', () => {
    const { log, runner } = make({
      *setup() {
        yield 'div'
        throw new BoardTrap('IntegerDivideByZero')
      },
      *loop() {
        yield 'never'
      },
    })

    runner.runUntil(1000)

    expect(runner.phase).toBe('halted')
    expect(runner.error).toBe('IntegerDivideByZero')
    expect(runner.currentBlock).toBe('div')
    expect(log.entries.at(-1)).toMatchObject({ dev: 'board', key: 'trap', value: 'IntegerDivideByZero' })
  })

  it('rethrows anything that is not a board trap, because that is a simulator bug', () => {
    const { runner } = make({
      // eslint-disable-next-line require-yield -- the routine throws before it would yield
      *setup() {
        throw new TypeError('bad generated code')
      },
      *loop() {
        yield 'x'
      },
    })

    expect(() => runner.runUntil(10)).toThrow('bad generated code')
  })

  it('steps to the next block, skipping a wait in between', () => {
    const { clock, runner } = make({
      *setup() {
        yield 'first'
        yield { wait: 500 }
        yield 'second'
      },
      *loop() {
        yield 'third'
      },
    })

    runner.stepBlock()
    expect(runner.currentBlock).toBe('first')
    runner.stepBlock()
    expect(runner.currentBlock).toBe('second')
    expect(clock.now).toBe(500 + 2 * COST.statement)
    runner.stepBlock()
    expect(runner.currentBlock).toBe('third')
  })
})

describe('EventLog', () => {
  it('records a value only when it changes, stamped with virtual time', () => {
    const clock = new Clock()
    const log = new EventLog(clock)

    log.record('pca9685', 'ch15', 4095)
    clock.advance(10)
    log.record('pca9685', 'ch15', 4095)
    log.record('pca9685', 'ch15', 0)

    expect(log.entries).toEqual([
      { t: 0, dev: 'pca9685', key: 'ch15', value: 4095 },
      { t: 10, dev: 'pca9685', key: 'ch15', value: 0 },
    ])
  })
})

/**
 * Type-only check that a hand-written routine satisfies the generated-code contract.
 * @yields {string | { wait: number }} A block id, then a one-microsecond wait.
 */
export const routineShape: () => Routine = function* () {
  yield 'id'
  yield { wait: 1 }
}
