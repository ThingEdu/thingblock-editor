/**
 * The IR eye on IO4 and what sits in front of it: a FanRoc ball the learner picks, or the egg sorting belt.
 *
 * Logic and numbers ported from ThingEdu/thingbot-sim `src/belt.ts` (https://github.com/ThingEdu/thingbot-sim,
 * commit bde12a2); its drawing stays in the editor's panel.
 *
 * The IR eye is a reflectance module (the kind under the Cobot chassis) on the ThingBot sensor port, signal on
 * IO4, read by `analogRead(4)` as 0…4095: the more infrared the thing in front reflects, the bigger the number.
 * It does not see colour, only "reflects a lot or a little", so the readings below are estimates of reflectance,
 * not measurements of one module; on the real robot the learner measures and picks a threshold.
 *
 * The belt: motor M1 pulls it, eggs ride past the IR eye mounted just above servo S1's gate arm. When an egg's
 * centre reaches the gate, an arm at 45° or more pushes it into the reject bin; otherwise it rides on into the
 * good bin. Good eggs have bright shells and reflect a lot; bad eggs (dark when candled) reflect little.
 */

/** The GPIO the IR eye's signal reaches, and its rig input key. */
export const IR_PIN = 4
export const IR_INPUT = `adc${IR_PIN}`
/** Suggested threshold: below it is "dark". */
export const IR_DARK = 1500

export interface Ball {
  /** Stable id, as the panel names the ball. */
  id: string
  /** The number the IR eye reads with this ball in front. */
  ir: number
}

/** The five FanRoc balls, brightest first. */
export const BALLS: readonly Ball[] = [
  { id: 'white', ir: 3500 },
  { id: 'yellow', ir: 3100 },
  { id: 'red', ir: 2300 },
  { id: 'blue', ir: 1100 },
  { id: 'black', ir: 300 },
]
/** What the eye reads with no ball in front: nothing reflects. */
export const NO_BALL_IR = 80

/**
 * The ball a reading belongs to.
 * @param ir A value the rig drove onto IO4.
 * @returns The ball whose reading it is, or undefined (no ball, or a belt reading).
 */
export const ballByReading = (ir: number): Ball | undefined => BALLS.find((b) => b.ir === ir)

/** Rig input: 1 puts the egg belt in front of the IR eye, 0 takes it away. */
export const BELT_INPUT = 'belt'
/** Readings of the grey rubber belt, a good egg and a bad egg. */
export const BELT_IR = 2600
export const GOOD_EGG_IR = 3300
export const BAD_EGG_IR = 900
/** A gate arm at this angle or more pushes the egg into the reject bin. */
export const GATE_DEG = 45

/** Millimetres along the belt. */
export const BELT_LENGTH = 300
export const GATE_X = 200
/** The eye sits just before the gate, so it still sees the egg that is reaching the gate. */
export const SENSOR_X = 196
export const SENSE_HALF = 10
export const EGG_R = 11
const SPACING = 50
/** At 100 % the belt runs 80 mm/s; below 15 % the TT motor cannot overcome friction. */
const SPEED_MM_S = 80
const DEAD_BAND = 0.15
/** Order of the eggs: T good, H bad. */
const PATTERN = 'TTHTHTTHTTTHHT'
/** Seconds an egg takes to drop into its bin, kept for drawing. */
const FALL_S = 1.2

export interface Egg {
  id: number
  /** Position along the belt, mm. */
  x: number
  bad: boolean
  /** null while on the belt; `reject` pushed into the reject bin; `pass` rode into the good bin. */
  fate: null | 'reject' | 'pass'
  /** Seconds since it left the belt, for drawing the drop. */
  fall: number
}

export interface BeltState {
  /** How far the belt has run, mm. */
  moved: number
  /** Bad eggs rejected and good eggs passed: the right calls. */
  rejectedBad: number
  passedGood: number
  /** Good eggs rejected and bad eggs passed: the wrong calls. */
  rejectedGood: number
  passedBad: number
  /** What the IR eye reads now. */
  ir: number
  /** The gate arm's angle, degrees. */
  gate: number
  eggs: Egg[]
}

/** What the belt reports when an egg leaves it, for the event log. */
export interface EggFate {
  fate: 'reject' | 'pass'
  bad: boolean
}

export class Belt {
  private eggs: Egg[] = []
  private next = 0
  private st: Omit<BeltState, 'eggs'>

  constructor() {
    // Three eggs already on the belt, so the first one arrives soon.
    for (const x of [140, 90, 40]) this.addEgg(x)
    this.st = { moved: 0, rejectedBad: 0, passedGood: 0, rejectedGood: 0, passedBad: 0, ir: BELT_IR, gate: 0 }
    this.st.ir = this.sense()
  }

  /**
   * What the IR eye reads now.
   * @returns The reading, 0…4095.
   */
  get ir(): number {
    return this.st.ir
  }

  /**
   * Advance the belt.
   * @param motor M1's speed, -1…1 (the belt only runs forward).
   * @param servoDeg Servo S1's angle, or null while the program has not set it.
   * @param dt Seconds.
   * @returns The eggs that left the belt during this step.
   */
  step(motor: number, servoDeg: number | null, dt: number): EggFate[] {
    const st = this.st
    if (servoDeg !== null) st.gate = servoDeg
    const v = Math.abs(motor) < DEAD_BAND ? 0 : Math.max(0, motor) * SPEED_MM_S
    const dx = v * dt
    st.moved += dx
    const left: EggFate[] = []
    for (const e of this.eggs) {
      if (e.fate !== null) {
        e.fall += dt
        continue
      }
      const before = e.x
      e.x += dx
      if (before < GATE_X && e.x >= GATE_X && st.gate >= GATE_DEG) {
        e.fate = 'reject'
        if (e.bad) st.rejectedBad++
        else st.rejectedGood++
        left.push({ fate: 'reject', bad: e.bad })
      } else if (e.x >= BELT_LENGTH) {
        e.fate = 'pass'
        if (e.bad) st.passedBad++
        else st.passedGood++
        left.push({ fate: 'pass', bad: e.bad })
      }
    }
    this.eggs = this.eggs.filter((e) => e.fate === null || e.fall < FALL_S)
    const last = this.eggs.filter((e) => e.fate === null).reduce((m, e) => Math.min(m, e.x), Infinity)
    if (last >= SPACING - EGG_R) this.addEgg(Math.min(0, last - SPACING))
    st.ir = this.sense()
    return left
  }

  state(): BeltState {
    return { ...this.st, eggs: this.eggs.map((e) => ({ ...e })) }
  }

  private addEgg(x: number): void {
    this.eggs.push({ id: this.next, x, bad: PATTERN[this.next % PATTERN.length] === 'H', fate: null, fall: 0 })
    this.next++
  }

  private sense(): number {
    const under = this.eggs.find((e) => e.fate === null && Math.abs(e.x - SENSOR_X) <= SENSE_HALF)
    return under ? (under.bad ? BAD_EGG_IR : GOOD_EGG_IR) : BELT_IR
  }
}
