/**
 * The "Camera AI" examples open without a board and play: each one loads in the real VM with no block it
 * cannot run, and a synthetic hand that does what the game asks scores, as a child would.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { CameraAiRun, reachFor, type Player } from './support/camera-ai-vm'

const DIR = join(__dirname, '..', 'src', 'examples', 'camera-ai')
const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) as {
  groups: string[]
  examples: { id: string; file: string; group: string; device: string | null; peripherals: string[] }[]
}

interface Project {
  targets: { blocks: Record<string, { opcode: string } | unknown[]>; comments: Record<string, { text: string }> }[]
  extensions: string[]
  board?: unknown
}

const bytes = (file: string) => readFileSync(join(DIR, file))
const project = async (file: string): Promise<Project> => {
  const entry = (await JSZip.loadAsync(bytes(file))).file('project.json')
  if (!entry) throw new Error(`${file}: no project.json`)
  return JSON.parse(await entry.async('string')) as Project
}

const opcodes = (p: Project) =>
  p.targets.flatMap((t) => Object.values(t.blocks).flatMap((b) => (Array.isArray(b) ? [] : [b.opcode])))

const GESTURE_BY_NAME: Record<string, string> = { 'Nắm tay': 'fist', 'Xòe tay': 'open', 'Chữ V': 'victory' }
/**
 * Plays Phản xạ cử chỉ the way it asks: the gesture the playground just named.
 * @param snapshot What the player sees.
 * @param snapshot.playground The playground, whose message names the gesture.
 * @returns The hand to show.
 */
const followOrders: Player = ({ playground }) => {
  const named = Object.keys(GESTURE_BY_NAME).find((name) => playground.say.includes(name))
  return { x: 0, y: 0, gesture: named ? GESTURE_BY_NAME[named] : 'none' }
}

/**
 * Keeps a ball up: meets it while it falls, then drops away so the next fall is a new touch.
 * @param snapshot What the player sees.
 * @param snapshot.playground The playground, holding the ball.
 * @returns The hand to show, or none once the ball is gone.
 */
const juggle: Player = ({ playground }) => {
  const ball = playground.objects.find((o) => o.name === 'bong')
  if (!ball) return null
  return ball.vy < 0 ? { x: ball.x, y: ball.y, gesture: 'open' } : { x: ball.x, y: -150, gesture: 'open' }
}

const scored =
  (n = 1) =>
  (s: { playground: { scores: [number, number] } }) =>
    s.playground.scores[0] >= n

describe('Camera AI examples', () => {
  it('lists seven boardless examples in the Camera AI group, one .tb each', () => {
    expect(index.groups).toEqual(['Camera AI'])
    expect(index.examples).toHaveLength(7)
    for (const example of index.examples) {
      expect(example.group).toBe('Camera AI')
      expect(example.device).toBeNull()
      expect(example.peripherals).toEqual([])
      expect(existsSync(join(DIR, example.file))).toBe(true)
    }
    expect(
      readdirSync(DIR)
        .filter((f) => f.endsWith('.tb'))
        .sort(),
    ).toEqual(index.examples.map((e) => e.file).sort())
  })

  it.each(index.examples.map((e) => e.file))(
    '%s saves no board, uses only Camera AI and opens with a note',
    async (file) => {
      const p = await project(file)
      // No board: opening it leaves the editor without one, where Camera AI lives, and loads the extension.
      expect(p.board).toBeUndefined()
      expect(p.extensions).toEqual(['cameraAi'])
      const notes = p.targets.flatMap((t) => Object.values(t.comments).map((c) => c.text))
      expect(notes[0]).toMatch(/Nhiệm vụ:/)
      expect(notes[0]).toMatch(/Chuột \(không cần webcam\)/)
    },
  )

  it.each(index.examples.map((e) => e.file))('%s uses only blocks the VM runs', async (file) => {
    const run = await CameraAiRun.load(bytes(file))
    try {
      expect(run.unknownOpcodes(opcodes(await project(file)))).toEqual([])
    } finally {
      run.stop()
    }
  })

  const plays: [string, Player, (s: CameraAiRun['snapshot']) => boolean, number][] = [
    // The star follows the index tip, and the playground names the gesture.
    [
      'cam-01-tay-em-tren-san-choi.tb',
      () => ({ x: 100, y: -50, gesture: 'victory' }),
      ({ playground }) =>
        playground.say === 'Chữ V ✌️' &&
        playground.objects.some((o) => o.name === 'sao' && o.x === 100 && o.y === -50),
      2000,
    ],
    ['cam-02-bat-de.tb', reachFor('de'), scored(2), 3000],
    ['cam-03-hung-mua.tb', reachFor('giot'), scored(2), 3000],
    ['cam-04-do-bong.tb', juggle, scored(2), 4000],
    ['cam-05-hai-sao-ne-bom.tb', reachFor('sao'), scored(2), 3000],
    // After the 3-2-1 the round is judged; a fist always wins, loses or draws, never "no hand".
    [
      'cam-06-oan-tu-ti.tb',
      () => ({ x: 0, y: 0, gesture: 'fist' }),
      ({ playground }) => /^Máy (✊|✋|✌️) – Em ✊ → (Hoà!|Em thắng!|Máy thắng!)$/.test(playground.say),
      7000,
    ],
    ['cam-07-phan-xa-cu-chi.tb', followOrders, scored(2), 3000],
  ]

  it.each(plays)(
    '%s plays with a hand',
    async (file, player, done, ms) => {
      const run = await CameraAiRun.load(bytes(file))
      try {
        run.play(player)
        expect(await run.until(done, ms), JSON.stringify(run.snapshot.playground)).toBe(true)
      } finally {
        run.stop()
      }
    },
    10_000,
  )
})
