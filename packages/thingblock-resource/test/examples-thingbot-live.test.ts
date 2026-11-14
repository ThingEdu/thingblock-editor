/**
 * The "ThingBot Live" examples open without a board and drive the robot over Bluetooth: each one loads in
 * the real VM with no block it cannot run, every loop waits between rounds so the Bluetooth link keeps up,
 * and, against a fake robot, each one sends the commands its note promises.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { CameraAiRun } from './support/camera-ai-vm'
import { attachFakeThingBot, type FakeThingBot, ThingBotLiveRun } from './support/thingbot-live-vm'

const DIR = join(__dirname, '..', 'src', 'examples', 'thingbot-live')
const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) as {
  groups: string[]
  examples: { id: string; file: string; group: string; device: string | null; peripherals: string[] }[]
}

interface Block {
  opcode: string
  next: string | null
  inputs: Partial<Record<string, [number, string | unknown[] | null]>>
}
interface Project {
  targets: { blocks: Record<string, Block | unknown[]> }[]
  extensions: string[]
  board?: unknown
}

const bytes = (file: string) => readFileSync(join(DIR, file))
const project = async (file: string): Promise<Project> => {
  const entry = (await JSZip.loadAsync(bytes(file))).file('project.json')
  if (!entry) throw new Error(`${file}: no project.json`)
  return JSON.parse(await entry.async('string')) as Project
}
const blocksOf = (p: Project) =>
  p.targets.flatMap((t) => Object.values(t.blocks).filter((b): b is Block => !Array.isArray(b)))
const LOOPS = new Set(['control_forever', 'control_repeat', 'control_repeat_until'])

/**
 * Whether every loop body waits somewhere along its own stack.
 * @param p The project.
 * @returns The opcodes of the loops that never wait.
 */
const loopsWithoutWait = (p: Project): string[] => {
  const all = Object.assign({}, ...p.targets.map((t) => t.blocks)) as Record<string, Block>
  return blocksOf(p)
    .filter((b) => LOOPS.has(b.opcode))
    .filter((loop) => {
      let id = loop.inputs.SUBSTACK?.[1] as string | null | undefined
      while (id) {
        if (all[id].opcode === 'control_wait') return false
        id = all[id].next
      }
      return true
    })
    .map((b) => b.opcode)
}

const MOTOR = 'controlDC'
const lastSpeeds = (robot: FakeThingBot) => {
  const speeds: Record<number, number> = {}
  for (const [id, speed] of robot.sent(MOTOR)) speeds[id] = speed
  return speeds
}
const ledIs = (robot: FakeThingBot, id: number, on: boolean) => {
  const sent = robot.sent('controlLED').filter(([n]) => n === id)
  return sent.length > 0 && sent[sent.length - 1][1] === (on ? 100 : 0)
}

describe('ThingBot Live examples', () => {
  it('lists every example under the ThingBot Live group, with no board', () => {
    expect(index.groups).toEqual(['ThingBot Live'])
    expect(index.examples.length).toBeGreaterThanOrEqual(10)
    for (const example of index.examples) {
      expect(example.group).toBe('ThingBot Live')
      expect(example.device).toBeNull()
    }
  })

  it.each(index.examples.map((e) => e.file))(
    '%s loads in the VM, uses the live blocks and waits in loops',
    async (file) => {
      const p = await project(file)
      expect(p.board).toBeUndefined()
      expect(p.extensions).toContain('thingbotTelemetrix')
      expect(loopsWithoutWait(p)).toEqual([])
      const run = await ThingBotLiveRun.load(bytes(file))
      try {
        expect(run.unknownOpcodes(blocksOf(p).map((b) => b.opcode))).toEqual([])
      } finally {
        run.stop()
      }
    },
  )

  const plays: [string, (run: ThingBotLiveRun) => Promise<void>][] = [
    [
      'live-01-den-nhap-nhay.tb',
      async (run) => {
        run.start()
        expect(await run.until((r) => ledIs(r, 1, true), 500)).toBe(true)
        expect(await run.until((r) => ledIs(r, 1, false), 1000)).toBe(true)
      },
    ],
    [
      'live-02-hai-den-va-coi.tb',
      async (run) => {
        run.start()
        expect(await run.until((r) => r.sent('controlBuzzer').some(([f]) => f === 40), 1500)).toBe(true)
        expect(ledIs(run.robot, 2, true) && ledIs(run.robot, 1, false)).toBe(true)
        expect(run.robot.sent('controlBuzzer').map(([f]) => f)).toEqual(expect.arrayContaining([60, 0, 40]))
      },
    ],
    [
      'live-03-coi-bao-thuc.tb',
      async (run) => {
        run.start()
        expect(await run.until((r) => ledIs(r, 1, true), 5000)).toBe(true)
        expect(run.robot.sent('controlBuzzer').filter(([f]) => f === 60)).toHaveLength(3)
      },
    ],
    [
      'live-04-xe-chay-thu.tb',
      async (run) => {
        run.start()
        // The green flag stops the project first, which halts all four motors.
        const program = (r: FakeThingBot) => r.sent(MOTOR).slice(4)
        expect(await run.until((r) => program(r).length >= 8, 4000)).toBe(true)
        expect(program(run.robot)).toEqual([
          [1, 60],
          [2, 60],
          [1, 50],
          [2, -50],
          [1, -60],
          [2, -60],
          [1, 0],
          [2, 0],
        ])
      },
    ],
    [
      'live-05-lai-xe-bang-phim.tb',
      async (run) => {
        run.start()
        run.press('ArrowUp')
        expect(await run.until((r) => lastSpeeds(r)[1] === 70 && lastSpeeds(r)[2] === 70, 1000)).toBe(true)
        run.press('ArrowLeft')
        expect(await run.until((r) => lastSpeeds(r)[1] === -40 && lastSpeeds(r)[2] === 40, 1000)).toBe(true)
        run.press(' ')
        expect(await run.until((r) => lastSpeeds(r)[1] === 0 && lastSpeeds(r)[2] === 0, 1000)).toBe(true)
      },
    ],
    [
      'live-06-servo-vay-tay.tb',
      async (run) => {
        run.start()
        expect(await run.until((r) => r.sent('servoWrite').length === 11, 6000)).toBe(true)
        const angles = run.robot.sent('servoWrite').map(([, a]) => a)
        expect(angles.slice(0, 2)).toEqual([45, 135])
        expect(angles[angles.length - 1]).toBe(90)
      },
    ],
    [
      'live-07-nut-sw-bat-den.tb',
      async (run) => {
        run.robot.report({ digital: { 3: 1 } })
        run.start()
        expect(await run.until((r) => ledIs(r, 1, false), 500)).toBe(true)
        expect(run.robot.sent('setPinMode')).toEqual([[3, 5]])
        run.robot.report({ digital: { 3: 0 } })
        expect(await run.until((r) => ledIs(r, 1, true) && r.sent('controlBuzzer').at(-1)?.[0] === 20, 500)).toBe(
          true,
        )
      },
    ],
    [
      'live-08-xe-tranh-vat-can.tb',
      async (run) => {
        run.robot.report({ distance: 100 })
        run.start()
        expect(await run.until((r) => lastSpeeds(r)[1] === 60 && lastSpeeds(r)[2] === 60, 1000)).toBe(true)
        expect(run.robot.sent('setupUltrasonic')).toEqual([[0, 4]])
        const from = run.robot.commands.length
        run.robot.report({ distance: 10 })
        expect(await run.until((r) => r.sent(MOTOR, from).some(([, s]) => s === -50), 1000)).toBe(true)
      },
    ],
    [
      'live-09-nhiet-ke-do-am.tb',
      async (run) => {
        run.robot.report({ dht: { 4: { temperature: 35, humidity: 70 } } })
        run.start()
        expect(await run.until((r) => ledIs(r, 1, true), 1000)).toBe(true)
        expect(run.robot.sent('setupDHT')).toEqual([[4, 11]])
      },
    ],
    [
      'live-10-mat-hong-ngoai.tb',
      async (run) => {
        run.robot.report({ analog: { 4: 3000 } })
        run.start()
        expect(await run.until((r) => ledIs(r, 1, false), 1000)).toBe(true)
        run.robot.report({ analog: { 4: 900 } })
        expect(await run.until((r) => ledIs(r, 1, true), 1000)).toBe(true)
      },
    ],
  ]

  it.each(plays)('%s drives the robot as its note says', async (file, play) => {
    const run = await ThingBotLiveRun.load(bytes(file))
    try {
      await play(run)
    } finally {
      run.stop()
    }
  })

  it('live-11-tay-em-lai-xe.tb drives forward on an open hand and stops on a fist', async () => {
    const run = await CameraAiRun.load(bytes('live-11-tay-em-lai-xe.tb'))
    const robot = attachFakeThingBot(run.vm as never)
    let gesture = 'open'
    try {
      run.play(() => ({ x: 0, y: 0, gesture }))
      expect(await run.until(() => lastSpeeds(robot)[1] === 60 && lastSpeeds(robot)[2] === 60, 3000)).toBe(true)
      gesture = 'fist'
      expect(await run.until(() => lastSpeeds(robot)[1] === 0 && lastSpeeds(robot)[2] === 0, 3000)).toBe(true)
    } finally {
      run.stop()
    }
  })
})
