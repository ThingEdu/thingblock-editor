/**
 * Whole programs, from project blocks to virtual hardware: the simulator generator (with the ThingBot
 * and OLED packs' sim codegen) compiles a project, and the runner executes it on a virtual board.
 */
import * as Blockly from 'blockly/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { SimGenerator } from '../../scratch-blocks/src/generators/sim'
import { registerSimGenerators as registerOled } from '../../thingblock-resource/src/extensions/peripheral/oled/sim'
import { registerSimGenerators as registerThingBot } from '../../thingblock-resource/src/extensions/peripheral/thingbot-core/sim'
import { Order } from '../../scratch-blocks/src/generators/arduino/order'
import { createBoard } from '../src/board'
import { compileProgram, loadProject } from '../src/headless'
import { Runner } from '../src/runtime'
import { block, num, ProjectBuilder, stack, txt } from './support/project'

let generator: SimGenerator

beforeEach(() => {
  generator = new SimGenerator()
  registerThingBot(generator as never, Order as never)
  registerOled(generator as never, Order as never)
})

const run = (builder: ProjectBuilder, untilMs: number) => {
  const workspace = loadProject(Blockly, builder.project())
  const code = generator.workspaceToCode(workspace)
  expect(generator.diagnostics).toEqual([])
  const board = createBoard()
  const runner = new Runner(compileProgram<typeof board.$>(code)(board.$), board.clock, board.log)
  runner.runUntil(untilMs * 1000)
  workspace.dispose()
  return { board, runner, code }
}

/** A loop that shows one value on the OLED, so a test can read back what the board printed. */
const showOnOled = (p: ProjectBuilder, setup: ReturnType<typeof block>[], value: unknown) => {
  p.hat(
    'event_whenarduinobegin',
    stack(
      block('oled_init', { W: num(128), H: num(64) }, { ADDR: ['0x3c'], CHIP: ['SSD1306'] }),
      ...setup,
      block('oled_print', { DATA: value as string }, { EOL: ['nowarp'] }),
      block('oled_refresh'),
    ),
  )
}

const oledText = (board: ReturnType<typeof createBoard>) =>
  board.log.entries.filter((e) => e.dev === 'oled' && e.key === 'text').at(-1)?.value

describe('LED blink (project k4-01)', () => {
  it('turns LED_1 fully on and off every 500 ms of virtual time', () => {
    const p = new ProjectBuilder()
    p.hat('event_whenarduinobegin', stack(block('thingBotC3_init')))
    p.hat(
      'event_whenarduinoloop',
      stack(
        block('thingBotC3_setLed', { BRIGHTNESS: num(100) }, { LED: ['LED_1'] }),
        block('control_wait', { DURATION: num(0.5) }),
        block('thingBotC3_setLed', { BRIGHTNESS: num(0) }, { LED: ['LED_1'] }),
        block('control_wait', { DURATION: num(0.5) }),
      ),
    )

    const { board } = run(p, 3000)

    const led = board.log.entries.filter((e) => e.key === 'ch15')
    expect(led.map((e) => e.value)).toEqual([4096, 0, 4096, 0, 4096, 0])
    const gaps = led.slice(1).map((e, i) => (e.t - led[i].t) / 1000)
    // Each half period is the 500 ms wait plus the I2C write that switches the LED.
    for (const gap of gaps) expect(Math.abs(gap - 500)).toBeLessThan(1)
  })
})

describe('C++ arithmetic on the simulator', () => {
  it('divides two ints as the board does: 7 / 2 is 3', () => {
    const p = new ProjectBuilder()
    const x = p.variable('x')
    const div = p.reporter(block('operator_divide', { NUM1: num(7), NUM2: num(2) }))
    showOnOled(p, [block('data_setvariableto', { VALUE: div }, { VARIABLE: p.field(x) })], x)

    expect(oledText(run(p, 100).board)).toBe('3')
  })

  it('prints a double with two decimals: 7 / 2.5 is 2.80', () => {
    const p = new ProjectBuilder()
    const div = p.reporter(block('operator_divide', { NUM1: num(7), NUM2: num(2.5) }))
    showOnOled(p, [], div)

    expect(oledText(run(p, 100).board)).toBe('2.80')
  })

  it('truncates a fractional value stored in an int variable', () => {
    const p = new ProjectBuilder()
    const x = p.variable('x')
    showOnOled(p, [block('data_setvariableto', { VALUE: txt('2.9') }, { VARIABLE: p.field(x) })], x)

    expect(oledText(run(p, 100).board)).toBe('2')
  })

  it('keeps the truncated value in the variable, so later arithmetic sees 2, not 2.9', () => {
    const p = new ProjectBuilder()
    const x = p.variable('x')
    const sum = p.reporter(block('operator_add', { NUM1: x, NUM2: x }))
    showOnOled(p, [block('data_setvariableto', { VALUE: txt('2.9') }, { VARIABLE: p.field(x) })], sum)

    expect(oledText(run(p, 100).board)).toBe('4')
  })

  it('compares a typed numeric text as a number, as the Arduino generator does', () => {
    const p = new ProjectBuilder()
    const x = p.variable('x')
    const gt = p.reporter(block('operator_gt', { OPERAND1: x, OPERAND2: txt('10') }))
    showOnOled(p, [block('data_setvariableto', { VALUE: txt('9') }, { VARIABLE: p.field(x) })], gt)

    expect(oledText(run(p, 100).board)).toBe('0')
  })

  it('halts with a board trap on an integer division by zero', () => {
    const p = new ProjectBuilder()
    const zero = p.variable('zero')
    const div = p.reporter(block('operator_divide', { NUM1: num(1), NUM2: zero }))
    showOnOled(p, [], div)

    const { runner } = run(p, 100)

    expect(runner.phase).toBe('halted')
    expect(runner.error).toBe('IntegerDivideByZero')
  })

  it('refuses to build what the compiler rejects: a remainder of a double', () => {
    const p = new ProjectBuilder()
    const mod = p.reporter(block('operator_mod', { NUM1: num(7.5), NUM2: num(2) }))
    showOnOled(p, [], mod)

    generator.workspaceToCode(loadProject(Blockly, p.project()))

    expect(generator.diagnostics).toHaveLength(1)
  })
})

describe('Buttons and timing', () => {
  it('reads the ThingBot switch as pressed when the rig pulls it low', () => {
    const p = new ProjectBuilder()
    const pressed = p.reporter(block('thingBotC3_switch'))
    p.hat('event_whenarduinobegin', stack(block('thingBotC3_init')))
    p.hat(
      'event_whenarduinoloop',
      stack(
        block(
          'control_if_else',
          {
            CONDITION: pressed,
            SUBSTACK: stack(block('thingBotC3_setLed', { BRIGHTNESS: num(100) }, { LED: ['LED_2'] })),
            SUBSTACK2: stack(block('thingBotC3_setLed', { BRIGHTNESS: num(0) }, { LED: ['LED_2'] })),
          },
          {},
        ),
      ),
    )
    const workspace = loadProject(Blockly, p.project())
    const board = createBoard()
    const runner = new Runner(
      compileProgram<typeof board.$>(generator.workspaceToCode(workspace))(board.$),
      board.clock,
      board.log,
    )

    runner.runUntil(50_000)
    board.setInput('gpio3', 0)
    runner.runUntil(100_000)

    expect(board.log.entries.filter((e) => e.key === 'ch13').map((e) => e.value)).toEqual([0, 4096])
  })

  it('counts the timer in seconds from boot, as millis() / 1000.0', () => {
    const p = new ProjectBuilder()
    const timer = p.reporter(block('sensing_timer'))
    showOnOled(p, [block('control_wait', { DURATION: num(1.25) })], timer)

    // oled.begin() and the wait take 1.25 s; print happens right after, before display().
    expect(oledText(run(p, 2000).board)).toBe('1.25')
  })
})
