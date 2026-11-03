/**
 * The "Âm nhạc" examples play their tunes in the simulator: each one generates simulator code with no
 * unsupported block, and the buzzer sounds the tune's opening notes at their pitches, one after another.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as Blockly from 'blockly/core'
import JSZip from 'jszip'
import { beforeEach, describe, expect, it } from 'vitest'
import { Order } from '../../thingblock-blocks/src/generators/arduino/order'
import { SimGenerator } from '../../thingblock-blocks/src/generators/sim'
import { loadProject, type Sb3Project } from '../../thingblock-sim/src/headless'
import { Session } from '../../thingblock-sim/src/session'
import { noteFrequency } from '../src/extensions/peripheral/thingbot-core/sim'
import type { RegisterSimGenerators } from '../src/shared/types'

const EXAMPLES = join(__dirname, '../src/examples/thingbot')
const BUZZER = 14

const simPacks = import.meta.glob<{ registerSimGenerators: RegisterSimGenerators }>(
  '../src/extensions/peripheral/*/sim.ts',
  { eager: true },
)

let generator: SimGenerator
beforeEach(() => {
  generator = new SimGenerator()
  for (const pack of Object.values(simPacks)) pack.registerSimGenerators(generator as never, Order)
})

/** The opening notes of each tune, as `note+octave`. */
const OPENINGS: Record<string, string[]> = {
  'am-nhac-kia-con-buom-vang': ['C4', 'D4', 'E4', 'C4'],
  'am-nhac-twinkle': ['C4', 'C4', 'G4', 'G4', 'A4'],
  'am-nhac-happy-birthday': ['G4', 'G4', 'A4', 'G4', 'C5', 'B4'],
  'am-nhac-baby-shark': ['D4', 'E4', 'G4'],
  'am-nhac-jingle-bells': ['E4', 'E4', 'E4'],
  'am-nhac-ode-to-joy': ['E4', 'E4', 'F4', 'G4'],
}

const pitch = (name: string): number => noteFrequency(name.slice(0, -1), name.slice(-1))

/**
 * Run an example for 6 s of virtual time.
 * @param id The example's id.
 * @returns The pitches the buzzer sounded, note by note, in Hz.
 */
const play = async (id: string): Promise<number[]> => {
  const zip = await JSZip.loadAsync(readFileSync(join(EXAMPLES, `${id}.tb`)))
  const entry = zip.file('project.json')
  if (!entry) throw new Error(`${id}: no project.json`)
  const project = JSON.parse(await entry.async('string')) as Sb3Project
  const workspace = loadProject(Blockly, project)
  const code = generator.workspaceToCode(workspace)
  workspace.dispose()
  expect(generator.diagnostics, `${id} dùng khối chưa mô phỏng`).toEqual([])
  const session = new Session(code, { now: () => 0 })
  session.running = true
  const notes: number[] = []
  let sounding = false
  for (let t = 0; t < 6_000_000; ) {
    const snapshot = session.tick(5)
    expect(snapshot.phase).not.toBe('halted')
    const on = snapshot.pwm[BUZZER] > 0
    if (on && !sounding) notes.push(snapshot.pwmHz)
    sounding = on
    t = snapshot.t
  }
  return notes
}

describe('music examples play in the simulator', () => {
  for (const [id, opening] of Object.entries(OPENINGS)) {
    it(`${id} opens with ${opening.join(' ')}`, async () => {
      const notes = await play(id)
      expect(notes.length).toBeGreaterThanOrEqual(opening.length)
      opening.forEach((name, i) => {
        // The PCA9685 prescaler (27 MHz crystal) steps coarsely at high pitches: C5 plays at 507 Hz, not
        // 523 Hz, on the real board as in the simulator. Within 5 % is the note the tune means.
        expect(Math.abs(notes[i] - pitch(name)) / pitch(name), `nốt ${i + 1} (${name})`).toBeLessThan(0.05)
      })
    })
  }
})
