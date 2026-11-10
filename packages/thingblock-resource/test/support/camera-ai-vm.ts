/**
 * Run a Camera AI project headless, the way the editor does without a board: the real VM (its built
 * `dist/node` bundle, so `npm run build:libs` must have run) plays the project, and this harness stands in
 * for the GUI's playground panel. It answers the camera blocks and sends a hand every 33 ms, placed by a
 * `player` that can look at the playground first, as a child looks at the screen. The hand is synthetic:
 * every landmark at one point, so the index tip, the palm and the wrist are all where the player put it.
 */
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { handsOnStage, type CameraSnapshot as GradedSnapshot } from '../../../thingblock-sim/src/checker/camera'

const require = createRequire(import.meta.url)
const VM_BUNDLE = join(__dirname, '../../../thingblock-vm/dist/node/thingblock-vm.js')

/** The event names the VM's Camera AI extension shares with the playground panel. */
const CAMERA_COMMAND = 'CAMERA_AI_CAMERA_COMMAND'
const CAMERA_STATUS = 'CAMERA_AI_CAMERA_STATUS'
const VISION_RESULTS = 'CAMERA_AI_VISION_RESULTS'
const PLAYGROUND_UPDATE = 'CAMERA_AI_PLAYGROUND_UPDATE'
const STAGE_WIDTH = 480
const STAGE_HEIGHT = 360
const FRAME_MS = 33

export interface PlaygroundObject {
  name: string
  kind: string
  x: number
  y: number
  size: number
  vx: number
  vy: number
}

export interface PlaygroundState {
  objects: PlaygroundObject[]
  scores: [number, number]
  timeLeft: number | null
  say: string
  showScoreboard: boolean
}

/** Where the player holds a hand, in stage units, and the gesture it makes. */
export interface HandPose {
  x: number
  y: number
  gesture: string
}

export interface CameraAiSnapshot {
  cameraOn: boolean
  hands: HandPose[]
  playground: PlaygroundState
}

export type Player = (snapshot: CameraAiSnapshot) => HandPose | null

interface EventBus {
  on(name: string, listener: (payload: never) => void): void
  emit(name: string, payload: unknown): void
}

interface VirtualMachine {
  events: EventBus
  runtime: { getOpcodeFunction(opcode: string): unknown; getIsHat(opcode: string): boolean }
  project: { load(input: Buffer): Promise<void> }
  start(): void
  greenFlag(): void
  stopAll(): void
  quit(): void
}

const loadVm = (): new () => VirtualMachine => {
  if (!existsSync(VM_BUNDLE)) throw new Error(`${VM_BUNDLE} is missing: run \`npm run build:libs\` at the repo root`)
  const exported = require(VM_BUNDLE) as { default?: new () => VirtualMachine } & (new () => VirtualMachine)
  return exported.default ?? exported
}

const EMPTY: PlaygroundState = { objects: [], scores: [0, 0], timeLeft: null, say: '', showScoreboard: false }

// A stage point as the camera frame would hold it: the picture is mirrored, as the blocks ask by default.
const handAt = ({ x, y, gesture }: HandPose) => {
  const nx = 1 - (x / STAGE_WIDTH + 0.5)
  const ny = 0.5 - y / STAGE_HEIGHT
  return { gesture, score: 1, side: 'right', landmarks: Array.from({ length: 21 }, () => ({ x: nx, y: ny, z: 0 })) }
}

export class CameraAiRun {
  readonly vm: VirtualMachine
  snapshot: CameraAiSnapshot = { cameraOn: false, hands: [], playground: EMPTY }
  /** Every playground state the VM sent, oldest first. */
  readonly history: PlaygroundState[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private vision: { hands: ReturnType<typeof handAt>[]; mirror: boolean } = { hands: [], mirror: true }

  private constructor(vm: VirtualMachine) {
    this.vm = vm
  }

  /**
   * Load a project into a fresh VM; nothing runs until `play`.
   * @param project The `.tb` bytes.
   * @returns A run holding the loaded VM.
   */
  static async load(project: Buffer): Promise<CameraAiRun> {
    const VM = loadVm()
    const run = new CameraAiRun(new VM())
    const { events } = run.vm
    events.on(CAMERA_COMMAND, (command: { on?: boolean; device?: string }) => {
      if (typeof command.device === 'string') return
      run.snapshot = { ...run.snapshot, cameraOn: Boolean(command.on) }
      events.emit(CAMERA_STATUS, { on: Boolean(command.on), ready: Boolean(command.on) })
    })
    events.on(PLAYGROUND_UPDATE, (state: PlaygroundState) => {
      run.snapshot = { ...run.snapshot, playground: state }
      run.history.push(state)
    })
    await run.vm.project.load(project)
    return run
  }

  /**
   * The opcodes the VM cannot run.
   * @param opcodes Every opcode in the project.
   * @returns Those with no block function and no hat.
   */
  unknownOpcodes(opcodes: string[]): string[] {
    const { runtime } = this.vm
    // Menus are shadow blocks that only carry a field; the VM has no function for them.
    return opcodes.filter((op) => !op.includes('_menu_') && !runtime.getOpcodeFunction(op) && !runtime.getIsHat(op))
  }

  /**
   * Press the green flag and let the player move a hand in front of the camera, until `stop`.
   * @param player Where the hand is each frame; null shows no hand. Called only while the camera is on.
   */
  play(player: Player): void {
    this.vm.start()
    this.vm.greenFlag()
    this.timer = setInterval(() => {
      const pose = this.snapshot.cameraOn ? player(this.snapshot) : null
      this.snapshot = { ...this.snapshot, hands: pose ? [pose] : [] }
      this.vision = { hands: pose ? [handAt(pose)] : [], mirror: true }
      this.vm.events.emit(VISION_RESULTS, { ...this.vision, t: Date.now() })
    }, FRAME_MS)
  }

  /**
   * Play until `done` holds for the latest snapshot or `ms` pass.
   * @param done Whether the run got where the test wants it.
   * @param ms How long to wait, in real milliseconds.
   * @returns Whether `done` held.
   */
  async until(done: (snapshot: CameraAiSnapshot) => boolean, ms: number): Promise<boolean> {
    const end = Date.now() + ms
    while (Date.now() < end) {
      if (done(this.snapshot)) return true
      await new Promise((resolve) => setTimeout(resolve, FRAME_MS))
    }
    return done(this.snapshot)
  }

  /**
   * What a lesson's Camera AI rules are graded on, built as the editor's lesson panel builds it.
   * @returns The snapshot of the camera, the hands on the stage and the playground.
   */
  graded(): GradedSnapshot {
    const { playground, cameraOn } = this.snapshot
    return {
      cameraOn,
      hands: handsOnStage(this.vision),
      objects: playground.objects,
      scores: playground.scores,
      say: playground.say,
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.vm.stopAll()
    this.vm.quit()
  }
}

/**
 * A player whose hand rests on the named object while it is on the playground, else in the middle.
 * @param name The object to reach for.
 * @param gesture The gesture the hand makes.
 * @returns The player.
 */
export const reachFor =
  (name: string, gesture = 'open'): Player =>
  ({ playground }) => {
    const o = playground.objects.find((obj) => obj.name === name)
    return o ? { x: o.x, y: o.y, gesture } : { x: 0, y: 0, gesture }
  }
