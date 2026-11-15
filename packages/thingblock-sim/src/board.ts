/**
 * One virtual ThingBot: its clock, its event log, the inputs the rig drives, and `$`, the scope that
 * generated code runs against. `$` holds the Arduino core functions the C++ calls (`delay`, `millis`,
 * `digitalRead`, `map`, `Serial`…), the C++ value helpers, and `hw`, the constructors for the library
 * objects a sketch declares (`Adafruit_PWMServoDriver pwm;` becomes `$.hw.Adafruit_PWMServoDriver()`).
 */
import { MOTOR_CHANNELS, SERVO_CHANNEL, dutyToAngle } from './checker/thingbot-map'
import { cpp } from './cpp'
import COSTS from './hal/costs.json'
import { I2cBus } from './hal/i2c'
import { Pca9685 } from './hal/pca9685'
import { Belt, BELT_INPUT, IR_INPUT, IR_PIN } from './hal/rig'
import { Ps2x, Ultrasonic } from './hal/sensors'
import { Ssd1306 } from './hal/ssd1306'
import { Clock, EventLog, type Wait } from './runtime'

export interface Devices {
  pwm?: Pca9685
  oled?: Ssd1306
  /** The program reads a distance sensor, so the panel shows its control. */
  ultrasonic?: boolean
  /** The program reads a PS2 gamepad, so the panel shows its buttons. */
  ps2?: boolean
  /** The program has read the IR eye on IO4, so the panel shows what is in front of it. */
  ir?: boolean
}

/** Virtual time between two steps of the egg belt, in microseconds. */
export const RIG_STEP_US = 10_000

/**
 * M1's speed as the belt feels it: forward drives B with A grounded (see the checker's motor states).
 * @param duty The PCA9685 duty per channel.
 * @returns -1…1, 0 when stopped or both sides are driven.
 */
const m1Speed = (duty: readonly number[]): number => {
  const { a, b } = MOTOR_CHANNELS.M1
  const da = Math.min(duty[a], 4095)
  const db = Math.min(duty[b], 4095)
  if (db > 0 && da === 0) return db / 4095
  if (da > 0 && db === 0) return -da / 4095
  return 0
}

/**
 * Servo S1's angle, or null while its channel carries no servo pulse (never set, or fully on/off).
 * @param duty The PCA9685 duty per channel.
 * @returns Degrees, or null.
 */
const s1Angle = (duty: readonly number[]): number | null => {
  const d = duty[SERVO_CHANNEL.S1]
  return d <= 0 || d >= 4096 ? null : dutyToAngle(d)
}

export const createBoard = () => {
  const clock = new Clock()
  const log = new EventLog(clock)
  /** Levels the rig drives onto inputs, keyed `gpio<n>` or by sensor name. */
  const inputs = new Map<string, number>()
  const readInput = (key: string): number | undefined => inputs.get(key)
  const devices: Devices = {}
  const bus = new I2cBus(clock)
  /** The egg belt, while the rig puts it in front of the IR eye, and the virtual time it has reached. */
  let belt: Belt | null = null
  let beltT = 0

  /** Run the belt up to the board's clock, feeding its IR reading to IO4 and logging each egg it sorts. */
  const stepRig = (): void => {
    if (!belt) return
    while (beltT < clock.now) {
      const dt = Math.min(RIG_STEP_US, clock.now - beltT)
      beltT += dt
      const duty = devices.pwm ? devices.pwm.duty : []
      for (const egg of belt.step(devices.pwm ? m1Speed(duty) : 0, devices.pwm ? s1Angle(duty) : null, dt / 1e6)) {
        log.emit('belt', egg.fate, egg.bad ? 'bad' : 'good')
      }
      inputs.set(IR_INPUT, belt.ir)
    }
  }

  const serialWrite = (text: string): void => {
    log.emit('serial', 'out', text)
    clock.advance(COSTS.serialByteUs * text.length)
  }

  const $ = {
    ...cpp,

    delay: (ms: number): Wait => ({ wait: cpp.toUlong(ms) * 1000 }),
    delayMicroseconds: (us: number): Wait => ({ wait: cpp.toUlong(us) }),
    millis: (): number => clock.millis(),
    micros: (): number => clock.micros(),

    /**
     * `map()` from the ESP32 core (WMath.cpp): 32-bit long arithmetic, -1 for an empty input range.
     * @param x The value to map.
     * @param inMin The low end of the input range.
     * @param inMax The high end of the input range.
     * @param outMin The low end of the output range.
     * @param outMax The high end of the output range.
     * @returns The mapped value.
     */
    map: (x: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
      const run = cpp.i32(inMax - inMin)
      if (run === 0) return -1
      const rise = cpp.i32(outMax - outMin)
      const delta = cpp.i32(x - inMin)
      return cpp.i32(cpp.idiv(cpp.imul(delta, rise), run) + outMin)
    },
    constrain: (x: number, low: number, high: number): number => (x < low ? low : x > high ? high : x),

    pinMode: (_pin: number, _mode: number): void => {},
    digitalWrite: (pin: number, level: number): void => {
      log.record('gpio', `gpio${pin}`, level ? 1 : 0)
    },
    /**
     * Unconnected and pulled-up inputs read HIGH; the rig drives the rest.
     * @param pin The GPIO number.
     * @returns The pin level, 0 or 1.
     */
    digitalRead: (pin: number): number => inputs.get(`gpio${pin}`) ?? 1,
    /**
     * What the rig drives onto an analog input, 0 until it sets one. Each pin read is logged once, so the
     * checker knows which sensor the program asks.
     * @param pin The GPIO number, or a sensor channel name.
     * @returns The reading.
     */
    analogRead: (pin: number | string): number => {
      if (pin === IR_PIN) devices.ir = true
      log.record('read', `adc${pin}`, 1)
      return inputs.get(`adc${pin}`) ?? 0
    },

    Serial: {
      begin: (_baud: number): void => {},
      print: (text: string): void => serialWrite(text),
      println: (text = ''): void => serialWrite(`${text}\r\n`),
    },

    hw: {
      Adafruit_PWMServoDriver: (): Pca9685 => (devices.pwm = new Pca9685(clock, log, bus)),
      Adafruit_SSD1306: (width: number, height: number): Ssd1306 =>
        (devices.oled = new Ssd1306(width, height, log, bus)),
      Ultrasonic: (_trig: number, _echo: number): Ultrasonic => {
        devices.ultrasonic = true
        return new Ultrasonic(clock, readInput)
      },
      PS2X: (): Ps2x => {
        devices.ps2 = true
        return new Ps2x(readInput)
      },
    },
  }

  return {
    clock,
    log,
    devices,
    $,
    setInput: (key: string, value: number): void => {
      inputs.set(key, value)
      // Logged so the lesson checker sees what the learner set on the rig.
      log.record('input', key, value)
      if (key !== BELT_INPUT || Boolean(value) === Boolean(belt)) return
      // A belt put in front of the eye starts with fresh eggs from now on.
      belt = value ? new Belt() : null
      beltT = clock.now
      if (belt) inputs.set(IR_INPUT, belt.ir)
    },
    stepRig,
    hasBelt: (): boolean => belt !== null,
    /**
     * The egg belt as it is now, for the panel to draw.
     * @returns Its state, or null while the rig has no belt.
     */
    beltState: () => (belt ? belt.state() : null),
  }
}

export type Board = ReturnType<typeof createBoard>
export type Scope = Board['$']
