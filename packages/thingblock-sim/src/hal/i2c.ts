/**
 * The ThingBot's I2C bus, as far as timing goes: what each transmission costs at the current clock.
 * Drivers call `transfer()` once per `beginTransmission`/`endTransmission` (or `requestFrom`) that the
 * real Adafruit library performs, with the same payload length, so a call takes the virtual time it
 * takes on the board. The C++ parity build's TwoWire charges the same formula.
 */
import type { Clock } from '../runtime'
import COSTS from './costs.json'

export class I2cBus {
  clockHz = COSTS.i2cDefaultHz
  private readonly clock: Clock

  constructor(clock: Clock) {
    this.clock = clock
  }

  /**
   * Spend the time of one transmission.
   * @param payload Bytes after the address byte.
   */
  transfer(payload: number): void {
    this.clock.advance(Math.floor(((payload + 1) * 9 * 1_000_000) / this.clockHz))
  }
}
