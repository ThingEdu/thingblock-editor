// Imports scratch-blocks source, whose `Order` enum is not erasable syntax, so the package's tsc excludes this
// file; it only runs under vitest, which strips types without checking them.
/// <reference types="vite/client" />
/**
 * The "Mô phỏng ThingBot Sim" examples are the simulator's own lessons, so every one of them must run in
 * the simulator: generate without a missing block, and run without the board halting. The input
 * examples must also answer the panel's controls (the distance slider, the gamepad).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as Blockly from 'blockly/core'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { Order } from '../../../thingblock-blocks/src/generators/arduino/order'
import { SimGenerator } from '../../../thingblock-blocks/src/generators/sim'
import { loadProject, type Sb3Project } from '../../../thingblock-sim/src/headless'
import { Session } from '../../../thingblock-sim/src/session'
import type { RegisterSimGenerators } from '../../src/shared/types'

const EXAMPLES = join(__dirname, '../../src/examples/thingbot')
const index = JSON.parse(readFileSync(join(EXAMPLES, 'index.json'), 'utf8')) as {
  examples: { file: string; group: string }[]
}
const SIM_GROUP = 'Mô phỏng ThingBot Sim'
const simPacks = import.meta.glob<{ registerSimGenerators: RegisterSimGenerators }>(
  '../../src/extensions/peripheral/*/sim.ts',
  { eager: true },
)

const simCode = async (file: string): Promise<string> => {
  const zip = await JSZip.loadAsync(readFileSync(join(EXAMPLES, file)))
  const entry = zip.file('project.json')
  if (!entry) throw new Error(`${file} thiếu project.json`)
  const project = JSON.parse(await entry.async('string')) as Sb3Project
  const generator = new SimGenerator()
  for (const pack of Object.values(simPacks)) pack.registerSimGenerators(generator as never, Order)
  const workspace = loadProject(Blockly, project)
  const code = generator.workspaceToCode(workspace)
  workspace.dispose()
  expect(generator.diagnostics).toEqual([])
  return code
}

/** Duty of motor M<n>'s two channels: forward drives B with A at 0. */
const MOTOR_CHANNELS: Record<number, [number, number]> = { 1: [2, 3], 2: [4, 5], 3: [7, 6], 4: [1, 0] }
const motor = (pwm: number[], n: number): 'forward' | 'backward' | 'stopped' => {
  const [a, b] = MOTOR_CHANNELS[n]
  if (pwm[a] === 0 && pwm[b] > 0) return 'forward'
  if (pwm[a] > 0 && pwm[b] === 0) return 'backward'
  return 'stopped'
}

const start = async (file: string, inputs: Record<string, number> = {}): Promise<Session> => {
  const session = new Session(await simCode(file), { now: () => 0 })
  for (const [key, value] of Object.entries(inputs)) session.setInput(key, value)
  session.running = true
  return session
}

describe('simulator examples', () => {
  const simExamples = index.examples.filter((e) => e.group === SIM_GROUP).map((e) => e.file)

  it('lists the ten simulator examples', () => {
    expect(simExamples).toHaveLength(10)
  })

  it.each(simExamples)('%s runs in the simulator', async (file) => {
    const session = await start(file)
    for (let i = 0; i < 200; i++) session.tick(16)
    const snapshot = session.snapshot()
    expect(snapshot.error).toBeUndefined()
    expect(snapshot.phase).toBe('loop')
  })

  it('the distance sensor example lights L1 only when something is near', async () => {
    const far = await start('sim-06-cam-bien-khoang-cach.tb', { ultrasonic: 100 })
    for (let i = 0; i < 20; i++) far.tick(16)
    const near = await start('sim-06-cam-bien-khoang-cach.tb', { ultrasonic: 10 })
    for (let i = 0; i < 20; i++) near.tick(16)
    expect(far.snapshot().pwm[15]).not.toBe(near.snapshot().pwm[15])
  })

  it('the obstacle-avoiding car drives on when clear and turns when an obstacle is near', async () => {
    const clear = await start('sim-10-xe-tranh-vat-can.tb', { ultrasonic: 100 })
    for (let i = 0; i < 20; i++) clear.tick(16)
    expect([motor(clear.snapshot().pwm, 1), motor(clear.snapshot().pwm, 2)]).toEqual(['forward', 'forward'])

    const blocked = await start('sim-10-xe-tranh-vat-can.tb', { ultrasonic: 10 })
    for (let i = 0; i < 20; i++) blocked.tick(16)
    expect([motor(blocked.snapshot().pwm, 1), motor(blocked.snapshot().pwm, 2)]).toEqual(['forward', 'backward'])
  })

  it('the gamepad example drives forward while up is held and stops when it is released', async () => {
    const session = await start('sim-09-tay-cam-ps2.tb')
    // initPS2 waits one second before the controller answers.
    for (let i = 0; i < 80; i++) session.tick(16)
    expect(motor(session.snapshot().pwm, 1)).toBe('stopped')
    session.setInput('ps2:PSB_PAD_UP', 1)
    for (let i = 0; i < 10; i++) session.tick(16)
    expect([motor(session.snapshot().pwm, 1), motor(session.snapshot().pwm, 2)]).toEqual(['forward', 'forward'])
    session.setInput('ps2:PSB_PAD_UP', 0)
    for (let i = 0; i < 10; i++) session.tick(16)
    expect(motor(session.snapshot().pwm, 1)).toBe('stopped')
  })
})
