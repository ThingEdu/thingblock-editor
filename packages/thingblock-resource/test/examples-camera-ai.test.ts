/**
 * The "Camera AI" examples open without a board and play: each one loads in the real VM with no block it
 * cannot run, and a synthetic hand that does what the game asks scores, as a child would.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { CameraAiRun, reachFor, type HandPose, type Player } from './support/camera-ai-vm'

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

/**
 * Flies Dế Xanh: flaps both arms (0.3 s from high to low) whenever the cricket is falling below the
 * opening of the bamboo, as a child would.
 * @returns The player.
 */
const pilot = (): Player => {
  let flapAt = -Infinity
  return ({ playground }) => {
    const de = playground.objects.find((o) => o.name === 'de')
    const tre = playground.objects.find((o) => o.name === 'tre')
    const now = Date.now()
    if (de && tre && now - flapAt > 450 && de.vy <= 0 && de.y < tre.y - 10) flapAt = now
    const p = (now - flapAt) / 300
    const y = p < 1 ? 140 - 220 * p : -80
    const hands: HandPose[] = [
      { x: -110, y, gesture: 'open' },
      { x: 110, y, gesture: 'open' },
    ]
    return { hands, head: { x: 0, y: 60 } }
  }
}

/**
 * Leans the head so the basket, which goes to seven times the lean, is under the falling star.
 * @param snapshot What the player sees.
 * @param snapshot.playground The playground, with the star.
 * @returns The head, leaning.
 */
const leanUnderStar: Player = ({ playground }) => {
  const star = playground.objects.find((o) => o.name === 'sao')
  const tilt = star ? Math.max(-34, Math.min(34, star.x / 7)) : 0
  return { hands: [], head: { x: 0, y: 60, tilt } }
}

/**
 * Nods slowly, one nod every 0.8 s.
 * @returns The head, dipping and rising.
 */
const nodder: Player = () => ({
  hands: [],
  head: { x: 0, y: 60, nod: Math.max(0, Math.sin((2 * Math.PI * Date.now()) / 800)) },
})

/**
 * Stands tall, and squats when the ball is close.
 * @param snapshot What the player sees.
 * @param snapshot.playground The playground, with the ball.
 * @returns The head, high or low.
 */
const squatter: Player = ({ playground }) => {
  const ball = playground.objects.find((o) => o.name === 'bong')
  return { hands: [], head: { x: 0, y: ball && ball.x < 120 ? -90 : 60 } }
}

const scored =
  (n = 1) =>
  (s: { playground: { scores: [number, number] } }) =>
    s.playground.scores[0] >= n

describe('Camera AI examples', () => {
  it('lists eleven boardless examples in the Camera AI group, one .tb each', () => {
    expect(index.groups).toEqual(['Camera AI'])
    expect(index.examples).toHaveLength(11)
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
    // After the 3-2-1, flapping keeps the cricket in the opening until the bamboo has passed.
    ['cam-08-de-xanh-bay.tb', pilot(), scored(1), 13000],
    ['cam-09-nghieng-dau-hung-sao.tb', leanUnderStar, scored(1), 7000],
    [
      'cam-10-gat-dau-dem-nhip.tb',
      nodder,
      ({ playground }) => playground.scores[0] >= 2 && playground.say.startsWith('Gật lần'),
      5000,
    ],
    ['cam-11-ngoi-xuong-ne-bong.tb', squatter, scored(1), 10000],
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
    15_000,
  )

  it('Dế Xanh loses the round when it is not flapped', async () => {
    const run = await CameraAiRun.load(bytes('cam-08-de-xanh-bay.tb'))
    try {
      run.play(() => ({ hands: [], head: { x: 0, y: 60 } }))
      const fell = await run.until(({ playground }) => playground.say.startsWith('Ối! Dế bay qua 0 khe'), 8000)
      expect(fell, JSON.stringify(run.snapshot.playground)).toBe(true)
    } finally {
      run.stop()
    }
  }, 10_000)

  it('Ngồi xuống né bóng counts a hit, not a dodge, when the player stays standing', async () => {
    const run = await CameraAiRun.load(bytes('cam-11-ngoi-xuong-ne-bong.tb'))
    try {
      run.play(() => ({ hands: [], head: { x: 0, y: 60 } }))
      expect(await run.until(({ playground }) => playground.say === 'Ối, trúng đầu!', 8000)).toBe(true)
      expect(run.snapshot.playground.scores[0]).toBe(0)
    } finally {
      run.stop()
    }
  }, 10_000)
})
