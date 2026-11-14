/**
 * Run a ThingBot Live project headless, the way the editor does with no board selected: the real VM (its
 * built `dist/node` bundle, so `npm run build:libs` must have run) plays the project, and a fake robot
 * stands in for the Bluetooth link. The fake takes the place of the ThingBot Telemetrix extension's link,
 * records every command the blocks send and answers the sensor reporters with the readings a test sets.
 */
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const VM_BUNDLE = join(__dirname, '../../../thingblock-vm/dist/node/thingblock-vm.js')
const EXTENSION_ID = 'thingbotTelemetrix'
const STEP_MS = 20

export interface LiveVm {
  runtime: {
    getOpcodeFunction(opcode: string): unknown
    getIsHat(opcode: string): boolean
    peripherals: { _extensions: Record<string, { _telemetrix: unknown } | undefined> }
  }
  project: { load(input: Buffer): Promise<void> }
  start(): void
  greenFlag(): void
  stopAll(): void
  quit(): void
  postIOData(device: string, data: unknown): void
}

/** One command the program sent to the robot: the link method and its arguments. */
export type Command = [string, ...number[]]

/** What the fake robot reports back, as the firmware would. */
export interface Readings {
  digital: Partial<Record<number, number>>
  analog: Partial<Record<number, number>>
  distance: number
  dht: Partial<Record<number, { temperature: number; humidity: number }>>
}

/** A ThingBot that records commands and answers with the readings set on it. */
export class FakeThingBot {
  readonly commands: Command[] = []
  readings: Readings = { digital: {}, analog: {}, distance: 0, dht: {} }

  /**
   * Change what the robot reports from now on, as moving a sensor or pressing SW would.
   * @param readings The readings that change; the others stay as they were.
   */
  report(readings: Partial<Readings>): void {
    this.readings = {
      digital: { ...this.readings.digital, ...readings.digital },
      analog: { ...this.readings.analog, ...readings.analog },
      distance: readings.distance ?? this.readings.distance,
      dht: { ...this.readings.dht, ...readings.dht },
    }
  }
  isConnected(): boolean {
    return true
  }
  private record(name: string, ...args: number[]): void {
    this.commands.push([name, ...args])
  }
  setPinMode(pin: number, mode: number): void {
    this.record('setPinMode', pin, mode)
  }
  digitalWrite(pin: number, value: number): void {
    this.record('digitalWrite', pin, value)
  }
  pwmWrite(pin: number, value: number): void {
    this.record('pwmWrite', pin, value)
  }
  servoWrite(id: number, angle: number): void {
    this.record('servoWrite', id, angle)
  }
  controlDC(id: number, speed: number): void {
    this.record('controlDC', id, speed)
  }
  controlBuzzer(freq: number): void {
    this.record('controlBuzzer', freq)
  }
  controlLED(id: number, state: number): void {
    this.record('controlLED', id, state)
  }
  setupUltrasonic(trig: number, echo: number): void {
    this.record('setupUltrasonic', trig, echo)
  }
  setupDHT(pin: number, type: number): void {
    this.record('setupDHT', pin, type)
  }
  digitalRead(pin: number): number {
    return this.readings.digital[pin] ?? 0
  }
  analogRead(pin: number): number {
    return this.readings.analog[pin] ?? 0
  }
  readDistance(): number {
    return this.readings.distance
  }
  readTemperature(pin: number): number {
    return this.readings.dht[pin]?.temperature ?? 0
  }
  readHumidity(pin: number): number {
    return this.readings.dht[pin]?.humidity ?? 0
  }
  /**
   * The commands sent since `from`, by link method.
   * @param name The method, e.g. `controlDC`.
   * @param from Index into `commands` to start at.
   * @returns Each matching command's arguments.
   */
  sent(name: string, from = 0): number[][] {
    return this.commands.slice(from).flatMap(([n, ...args]) => (n === name ? [args] : []))
  }
}

const loadVm = (): new () => LiveVm => {
  if (!existsSync(VM_BUNDLE)) throw new Error(`${VM_BUNDLE} is missing: run \`npm run build:libs\` at the repo root`)
  const exported = require(VM_BUNDLE) as { default?: new () => LiveVm } & (new () => LiveVm)
  return exported.default ?? exported
}

/**
 * Put the fake robot behind the ThingBot Telemetrix extension of a VM that has loaded a live project.
 * @param vm A VM that has loaded a project using the live blocks.
 * @returns The fake robot now answering those blocks.
 */
export const attachFakeThingBot = (vm: LiveVm): FakeThingBot => {
  const extension = vm.runtime.peripherals._extensions[EXTENSION_ID]
  if (!extension) throw new Error(`the project did not load the ${EXTENSION_ID} extension`)
  const robot = new FakeThingBot()
  extension._telemetrix = robot
  return robot
}

export class ThingBotLiveRun {
  readonly vm: LiveVm
  readonly robot: FakeThingBot

  private constructor(vm: LiveVm, robot: FakeThingBot) {
    this.vm = vm
    this.robot = robot
  }

  /**
   * Load a project into a fresh VM with the fake robot connected; nothing runs until `start`.
   * @param project The `.tb` bytes.
   * @returns A run holding the loaded VM and its fake robot.
   */
  static async load(project: Buffer): Promise<ThingBotLiveRun> {
    const VM = loadVm()
    const vm = new VM()
    await vm.project.load(project)
    return new ThingBotLiveRun(vm, attachFakeThingBot(vm))
  }

  /**
   * The opcodes the VM cannot run.
   * @param opcodes Every opcode in the project.
   * @returns Those with no block function and no hat.
   */
  unknownOpcodes(opcodes: string[]): string[] {
    const { runtime } = this.vm
    return opcodes.filter((op) => !op.includes('_menu_') && !runtime.getOpcodeFunction(op) && !runtime.getIsHat(op))
  }

  /** Start the VM and press the green flag. */
  start(): void {
    this.vm.start()
    this.vm.greenFlag()
  }

  /**
   * Press and release a key, as the editor posts it to the VM.
   * @param key The key name the VM's keyboard knows, e.g. `ArrowUp` or ` `.
   */
  press(key: string): void {
    this.vm.postIOData('keyboard', { key, isDown: true })
    this.vm.postIOData('keyboard', { key, isDown: false })
  }

  /**
   * Run until `done` holds or `ms` pass.
   * @param done Whether the robot got where the test wants it.
   * @param ms How long to wait, in real milliseconds.
   * @returns Whether `done` held.
   */
  async until(done: (robot: FakeThingBot) => boolean, ms: number): Promise<boolean> {
    const end = Date.now() + ms
    while (Date.now() < end) {
      if (done(this.robot)) return true
      await new Promise((resolve) => setTimeout(resolve, STEP_MS))
    }
    return done(this.robot)
  }

  stop(): void {
    this.vm.stopAll()
    this.vm.quit()
  }
}
