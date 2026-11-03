/**
 * Adafruit_PWMServoDriver for the PCA9685 on the ThingBot, which drives its LEDs, buzzer, servos and
 * motors. Each method makes the I2C transmissions the library makes and waits where it waits (10 ms in
 * `reset()`, 5 ms in `setPWMFreq()`), so timing matches the board. Each channel is logged as its duty
 * out of 4096 (4096 = fully on), and a frequency change as the prescaler value written to the chip.
 */
import type { Clock, EventLog } from '../runtime'
import type { I2cBus } from './i2c'

/** The library's default internal oscillator, which `begin()` restores. */
const FREQUENCY_OSCILLATOR = 25_000_000
const PRESCALE_MIN = 3
const PRESCALE_MAX = 255

export class Pca9685 {
  /** Duty per channel, out of 4096. */
  readonly duty = new Array<number>(16).fill(0)
  prescale = 0
  private oscillator = FREQUENCY_OSCILLATOR
  private readonly clock: Clock
  private readonly log: EventLog
  private readonly bus: I2cBus

  constructor(clock: Clock, log: EventLog, bus: I2cBus) {
    this.clock = clock
    this.log = log
    this.bus = bus
  }

  /**
   * `begin()`: probe the address, reset, restore the default oscillator, set 1 kHz.
   * @returns Always true, as the library does once the probe is sent.
   */
  begin(): boolean {
    this.bus.transfer(0)
    this.reset()
    this.setOscillatorFrequency(FREQUENCY_OSCILLATOR)
    this.setPWMFreq(1000)
    return true
  }

  reset(): void {
    this.write8()
    this.clock.advance(10_000)
  }

  setOscillatorFrequency(hz: number): void {
    this.oscillator = hz >>> 0
  }

  setPWMFreq(frequency: number): void {
    let freq = Math.fround(frequency)
    if (freq < 1) freq = 1
    if (freq > 3500) freq = 3500
    let prescaleval = Math.fround(this.oscillator / (freq * 4096.0) + 0.5 - 1)
    if (prescaleval < PRESCALE_MIN) prescaleval = PRESCALE_MIN
    if (prescaleval > PRESCALE_MAX) prescaleval = PRESCALE_MAX

    this.read8()
    this.write8()
    this.write8()
    this.prescale = Math.trunc(prescaleval)
    this.log.record('pca9685', 'prescale', this.prescale)
    this.write8()
    this.clock.advance(5_000)
    this.write8()
  }

  setPWM(channel: number, on: number, off: number): void {
    this.bus.transfer(5)
    const ch = channel & 15
    let duty: number
    if (on & 4096) duty = 4096
    else if (off & 4096) duty = 0
    else duty = ((off & 4095) - (on & 4095) + 4096) % 4096
    this.duty[ch] = duty
    this.log.record('pca9685', `ch${ch}`, duty)
  }

  setPin(channel: number, value: number, invert = false): void {
    const val = Math.min(value & 0xffff, 4095)
    const level = invert ? 4095 - val : val
    if (level === 4095) this.setPWM(channel, 4096, 0)
    else if (level === 0) this.setPWM(channel, 0, 4096)
    else this.setPWM(channel, 0, level)
  }

  /** A one-register write: register address and value. */
  private write8(): void {
    this.bus.transfer(2)
  }

  /** A one-register read: the register address, then one byte back. */
  private read8(): void {
    this.bus.transfer(1)
    this.bus.transfer(1)
  }
}
