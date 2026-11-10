/**
 * The ThingBot's input modules: the HC-SR04 distance sensor (the vendored `Ultrasonic` library) and the
 * PS2 wireless gamepad (`PS2X_lib`). Neither talks to anything the simulator draws; they read what the
 * rig's controls set, as the real module would report it.
 */
import type { Clock } from '../runtime'

/** Reads one rig input by key, undefined when the rig has not set it. */
export type InputReader = (key: string) => number | undefined

/** Rig input holding the distance in front of the sensor, in centimetres. */
export const DISTANCE_INPUT = 'ultrasonic'
/** Distance the sensor sees until the rig moves an obstacle: nothing near. */
export const DEFAULT_DISTANCE_CM = 100
/** The library's default `timeOut` for each echo wait, in microseconds. */
const ECHO_TIMEOUT_US = 20000
/** Echo time per centimetre the library assumes: `read(CM)` divides by 28, then by 2. */
const ECHO_US_PER_CM = 56

/** `Ultrasonic sonar(trig, echo);` */
export class Ultrasonic {
  private readonly clock: Clock
  private readonly input: InputReader

  constructor(clock: Clock, input: InputReader) {
    this.clock = clock
    this.input = input
  }

  /**
   * `read(und)`: the echo time divided by the unit's divisor and by two, in unsigned integer math.
   * @param und The unit divisor, `CM` (28) or `INC` (71).
   * @returns The distance in that unit.
   */
  read(und: number): number {
    const cm = Math.max(0, this.input(DISTANCE_INPUT) ?? DEFAULT_DISTANCE_CM)
    const echo = Math.min(Math.round(cm * ECHO_US_PER_CM), ECHO_TIMEOUT_US)
    // The 2 µs low and 10 µs trigger pulse, then the wait for the echo to end.
    this.clock.advance(12 + echo)
    return Math.floor(Math.floor(echo / und) / 2)
  }
}

/**
 * Rig input key for a gamepad button or stick.
 * @param name The button or stick constant's name, e.g. `PSB_PAD_UP`, `PSS_LX`.
 * @returns The input key, e.g. `ps2:PSB_PAD_UP`.
 */
export const ps2Input = (name: string): string => `ps2:${name}`
/** A stick at rest. */
const STICK_CENTRE = 128

/** `PS2X ps2x;`: the controller always answers, with what the rig holds at each `read_gamepad()`. */
export class Ps2x {
  private readonly input: InputReader
  private latched = new Map<string, number>()

  constructor(input: InputReader) {
    this.input = input
  }

  /**
   * `config_gamepad(clk, cmd, att, dat, pressures, rumble)`: 0, the controller was found.
   * @param _pins The wiring and options, which the virtual controller does not need.
   * @returns The library's error code.
   */
  config_gamepad(..._pins: unknown[]): number {
    return 0
  }

  /** `read_gamepad()`: take the state the buttons and sticks report until the next read. */
  read_gamepad(): void {
    this.latched = new Map()
    for (const name of PS2_NAMES) {
      const value = this.input(ps2Input(name))
      if (value !== undefined) this.latched.set(name, value)
    }
  }

  /**
   * `Button(PSB_…)`: held at the last read.
   * @param name The button constant's name.
   * @returns True while it was held.
   */
  Button(name: string): boolean {
    return (this.latched.get(name) ?? 0) !== 0
  }

  /**
   * `Analog(PSS_…)`: a stick axis at the last read, 0 to 255.
   * @param name The axis constant's name.
   * @returns The axis value.
   */
  Analog(name: string): number {
    return this.latched.get(name) ?? STICK_CENTRE
  }
}

/** Every button and stick the PS2 blocks name. */
export const PS2_NAMES = [
  'PSB_PAD_UP',
  'PSB_PAD_DOWN',
  'PSB_PAD_LEFT',
  'PSB_PAD_RIGHT',
  'PSB_TRIANGLE',
  'PSB_CIRCLE',
  'PSB_CROSS',
  'PSB_SQUARE',
  'PSB_L1',
  'PSB_L2',
  'PSB_L3',
  'PSB_R1',
  'PSB_R2',
  'PSB_R3',
  'PSB_SELECT',
  'PSB_START',
  'PSS_LX',
  'PSS_LY',
  'PSS_RX',
  'PSS_RY',
]
