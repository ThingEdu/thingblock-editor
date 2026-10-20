/**
 * One virtual ThingBot: its clock, its event log, the inputs the rig drives, and `$`, the scope that
 * generated code runs against. `$` holds the Arduino core functions the C++ calls (`delay`, `millis`,
 * `digitalRead`, `map`, `Serial`…), the C++ value helpers, and `hw`, the constructors for the library
 * objects a sketch declares (`Adafruit_PWMServoDriver pwm;` becomes `$.hw.Adafruit_PWMServoDriver()`).
 */
import { cpp } from './cpp'
import COSTS from './hal/costs.json'
import { I2cBus } from './hal/i2c'
import { Pca9685 } from './hal/pca9685'
import { Ssd1306 } from './hal/ssd1306'
import { Clock, EventLog, type Wait } from './runtime'

export interface Devices {
  pwm?: Pca9685
  oled?: Ssd1306
}

export const createBoard = () => {
  const clock = new Clock()
  const log = new EventLog(clock)
  /** Levels the rig drives onto inputs, keyed `gpio<n>` or by sensor name. */
  const inputs = new Map<string, number>()
  const devices: Devices = {}
  const bus = new I2cBus(clock)

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
    analogRead: (pin: number): number => inputs.get(`adc${pin}`) ?? 0,

    Serial: {
      begin: (_baud: number): void => {},
      print: (text: string): void => serialWrite(text),
      println: (text = ''): void => serialWrite(`${text}\r\n`),
    },

    hw: {
      Adafruit_PWMServoDriver: (): Pca9685 => (devices.pwm = new Pca9685(clock, log, bus)),
      Adafruit_SSD1306: (width: number, height: number): Ssd1306 =>
        (devices.oled = new Ssd1306(width, height, log, bus)),
    },
  }

  return {
    clock,
    log,
    devices,
    $,
    setInput: (key: string, value: number): void => {
      inputs.set(key, value)
    },
  }
}

export type Board = ReturnType<typeof createBoard>
export type Scope = Board['$']
