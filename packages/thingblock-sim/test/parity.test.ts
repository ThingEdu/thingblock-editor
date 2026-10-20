/**
 * Parity: one project, built twice. The Arduino generator's C++ runs on the host against the real
 * Adafruit libraries and the ESP32 core's Print/String; the simulator generator's JavaScript runs on the
 * virtual board. Both print an event log; the hardware-visible entries must agree, in order, with
 * virtual times within a small tolerance (the simulator charges each block a microsecond the host does
 * not, and its I2C costs are per call rather than per byte).
 */
import * as Blockly from 'blockly/core'
import { beforeAll, describe, expect, it } from 'vitest'
import { ArduinoGenerator } from '../../scratch-blocks/src/generators/arduino'
import { Order } from '../../scratch-blocks/src/generators/arduino/order'
import { SimGenerator } from '../../scratch-blocks/src/generators/sim'
import { registerGenerators as oledCpp } from '../../thingblock-resource/src/extensions/peripheral/oled/generator'
import { registerSimGenerators as oledSim } from '../../thingblock-resource/src/extensions/peripheral/oled/sim'
import { registerGenerators as thingbotCpp } from '../../thingblock-resource/src/extensions/peripheral/thingbot-core/generator'
import { registerSimGenerators as thingbotSim } from '../../thingblock-resource/src/extensions/peripheral/thingbot-core/sim'
import { coreDir, runSketch } from '../parity/parity'
import { createBoard } from '../src/board'
import { compileProgram, loadProject } from '../src/headless'
import { Runner, type LogEntry } from '../src/runtime'
import { block, num, ProjectBuilder, stack, txt } from './support/project'

const cpp = new ArduinoGenerator()
const sim = new SimGenerator()

beforeAll(() => {
  thingbotCpp(cpp as never, Order as never)
  oledCpp(cpp as never, Order as never)
  thingbotSim(sim as never, Order as never)
  oledSim(sim as never, Order as never)
})

/** The entries both builds produce: device state and serial text, not the simulator-only text record. */
const comparable = (log: LogEntry[]) => log.filter((e) => e.dev !== 'serial' && e.key !== 'text')
const serialText = (log: LogEntry[]) =>
  log
    .filter((e) => e.dev === 'serial')
    .map((e) => e.value)
    .join('')

const runBoth = (builder: ProjectBuilder, ms: number, inputs: { t: number; key: string; value: number }[] = []) => {
  const workspace = loadProject(Blockly, builder.project())
  const sketch = cpp.workspaceToCode(workspace)
  const program = sim.workspaceToCode(workspace)
  workspace.dispose()
  expect(sim.diagnostics).toEqual([])

  const board = createBoard()
  const runner = new Runner(compileProgram<typeof board.$>(program)(board.$), board.clock, board.log)
  let at = 0
  for (const input of [...inputs].sort((a, b) => a.t - b.t)) {
    runner.runUntil(input.t)
    board.setInput(input.key, input.value)
    at = input.t
  }
  runner.runUntil(Math.max(at, ms * 1000))

  return { simLog: board.log.entries, cppLog: runSketch(sketch, ms, inputs), sketch, program }
}

const expectSameBehaviour = (simLog: LogEntry[], cppLog: LogEntry[], toleranceUs: number) => {
  const a = comparable(simLog)
  const b = comparable(cppLog)
  expect(a.map(({ dev, key, value }) => [dev, key, value])).toEqual(b.map(({ dev, key, value }) => [dev, key, value]))
  const drift = a.map((entry, i) => Math.abs(entry.t - b[i].t))
  expect(Math.max(0, ...drift)).toBeLessThanOrEqual(toleranceUs)
}

describe.skipIf(!coreDir())('simulator and C++ build agree', () => {
  it('k4-01 LED blink: the same LED edges at the same times', () => {
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

    const { simLog, cppLog } = runBoth(p, 3000)

    expectSameBehaviour(simLog, cppLog, 2000)
  })

  it('OLED text: the same pixels for the same printed values', () => {
    const p = new ProjectBuilder()
    const x = p.variable('x')
    const half = p.reporter(block('operator_divide', { NUM1: num(7), NUM2: num(2) }))
    const third = p.reporter(block('operator_divide', { NUM1: num(1), NUM2: num(3.0001) }))
    p.hat(
      'event_whenarduinobegin',
      stack(
        block('oled_init', { W: num(128), H: num(64) }, { ADDR: ['0x3c'], CHIP: ['SSD1306'] }),
        block('data_setvariableto', { VALUE: txt('2.9') }, { VARIABLE: p.field(x) }),
        block('oled_print', { DATA: txt('ThingBot') }, { EOL: ['warp'] }),
        block('oled_print', { DATA: half }, { EOL: ['warp'] }),
        block('oled_print', { DATA: third }, { EOL: ['warp'] }),
        block('oled_print', { DATA: x }, { EOL: ['nowarp'] }),
        block('oled_refresh'),
      ),
    )

    const { simLog, cppLog } = runBoth(p, 200)

    expectSameBehaviour(simLog, cppLog, 2000)
    expect(comparable(cppLog).filter((e) => e.key === 'frame').length).toBeGreaterThan(0)
  })

  it('Serial output prints the same text for ints, doubles and bools', () => {
    const p = new ProjectBuilder()
    const t = p.reporter(block('operator_gt', { OPERAND1: num(5), OPERAND2: txt('3') }))
    const d = p.reporter(block('operator_divide', { NUM1: num(10), NUM2: num(4.0) }))
    p.hat(
      'event_whenarduinobegin',
      stack(
        block('control_print', { STRING: t }),
        block('control_print', { STRING: d }),
        block('control_print', { STRING: num(42) }),
      ),
    )

    const { simLog, cppLog } = runBoth(p, 50)

    expect(serialText(simLog)).toBe(serialText(cppLog))
  })

  it('a button press read through the ThingBot switch', () => {
    const p = new ProjectBuilder()
    const pressed = p.reporter(block('thingBotC3_switch'))
    p.hat('event_whenarduinobegin', stack(block('thingBotC3_init')))
    p.hat(
      'event_whenarduinoloop',
      stack(
        block('control_if_else', {
          CONDITION: pressed,
          SUBSTACK: stack(block('thingBotC3_setLed', { BRIGHTNESS: num(100) }, { LED: ['LED_2'] })),
          SUBSTACK2: stack(block('thingBotC3_setLed', { BRIGHTNESS: num(0) }, { LED: ['LED_2'] })),
        }),
        block('control_wait', { DURATION: num(0.01) }),
      ),
    )

    const { simLog, cppLog } = runBoth(p, 500, [
      { t: 200_000, key: 'gpio3', value: 0 },
      { t: 350_000, key: 'gpio3', value: 1 },
    ])

    expectSameBehaviour(simLog, cppLog, 2000)
  })
})
