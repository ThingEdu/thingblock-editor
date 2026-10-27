import { describe, expect, it } from 'vitest'
import { createBoard } from '../src/board'
import COSTS from '../src/hal/costs.json'
import { FONT_5X7 } from '../src/hal/font5x7'

describe('Arduino core', () => {
  it('turns delay(ms) into a virtual sleep, with the argument converted to unsigned long', () => {
    const { $ } = createBoard()
    expect($.delay(1500.7)).toEqual({ wait: 1500 * 1000 })
    expect($.delay(-1)).toEqual({ wait: 4294967295 * 1000 })
  })

  it('maps with the core long arithmetic, returning -1 for an empty input range', () => {
    const { $ } = createBoard()
    expect($.map(50, 0, 100, 0, 4095)).toBe(2047)
    expect($.map(-5, 0, 100, 0, 4095)).toBe(-204)
    expect($.map(1, 5, 5, 0, 10)).toBe(-1)
  })

  it('reads a pin from the inputs the rig sets, HIGH when nothing drives it', () => {
    const board = createBoard()
    expect(board.$.digitalRead(3)).toBe(1)
    board.setInput('gpio3', 0)
    expect(board.$.digitalRead(3)).toBe(0)
  })

  it('logs every Serial write in order, and charges its transfer time per byte', () => {
    const { $, clock, log } = createBoard()
    $.Serial.println('hi')
    expect(log.entries).toEqual([{ t: 0, dev: 'serial', key: 'out', value: 'hi\r\n' }])
    expect(clock.now).toBe(4 * COSTS.serialByteUs)
  })
})

describe('PCA9685 (Adafruit_PWMServoDriver)', () => {
  it('logs each channel as its duty out of 4096, with the library full-on and full-off cases', () => {
    const { $, log } = createBoard()
    const pwm = $.hw.Adafruit_PWMServoDriver()

    pwm.setPin(15, 4095)
    pwm.setPin(13, 0)
    pwm.setPin(14, 1000)
    pwm.setPin(12, 9000)

    expect(log.entries.map((e) => [e.key, e.value])).toEqual([
      ['ch15', 4096],
      ['ch13', 0],
      ['ch14', 1000],
      ['ch12', 4096],
    ])
  })

  it('charges each channel update as the five-byte register write it is, at the 100 kHz default clock', () => {
    const { $, clock } = createBoard()
    $.hw.Adafruit_PWMServoDriver().setPWM(0, 0, 100)
    // Address byte plus register and four data bytes, nine clocks each.
    expect(clock.now).toBe((6 * 9 * 1_000_000) / COSTS.i2cDefaultHz)
  })

  it('begins at the library default: 1 kHz on the 25 MHz oscillator, after its 10 ms and 5 ms waits', () => {
    const { $, clock, log } = createBoard()
    $.hw.Adafruit_PWMServoDriver().begin()
    expect(log.entries).toEqual([expect.objectContaining({ key: 'prescale', value: 5 })])
    expect(clock.now).toBeGreaterThan(15_000)
  })

  it('computes the prescaler the way the library does for the 27 MHz crystal the ThingBot sets', () => {
    const { $ } = createBoard()
    const pwm = $.hw.Adafruit_PWMServoDriver()
    pwm.setOscillatorFrequency(27_000_000)
    pwm.setPWMFreq(50)
    expect(pwm.prescale).toBe(131)
  })
})

describe('SSD1306 (Adafruit_SSD1306 on Adafruit_GFX)', () => {
  const column = (oled: { getBuffer(): Uint8Array }, x: number) => oled.getBuffer()[x]

  it('draws the classic font glyph, one column byte per x, starting at the cursor', () => {
    const { $ } = createBoard()
    const oled = $.hw.Adafruit_SSD1306(128, 64)
    oled.begin()
    oled.setTextColor(1)

    oled.print('A')

    const glyph = Array.from(FONT_5X7.subarray(65 * 5, 65 * 5 + 5))
    expect([0, 1, 2, 3, 4].map((x) => column(oled, x))).toEqual(glyph)
    expect(column(oled, 5)).toBe(0)
  })

  it('draws nothing until a text colour is set, as GFX starts with 0xFFFF which SSD1306 ignores', () => {
    const { $ } = createBoard()
    const oled = $.hw.Adafruit_SSD1306(128, 64)
    oled.begin()
    const before = oled.getBuffer().slice()

    oled.print('A')

    expect(oled.getBuffer()).toEqual(before)
  })

  it('leaves the Adafruit splash in the buffer after begin(), so it shows unless the sketch clears it', () => {
    const { $ } = createBoard()
    const oled = $.hw.Adafruit_SSD1306(128, 64)
    oled.begin()
    expect(oled.getBuffer().some((b) => b !== 0)).toBe(true)
  })

  it('moves to the next text row on println and wraps a line that runs off the right edge', () => {
    const { $ } = createBoard()
    const oled = $.hw.Adafruit_SSD1306(128, 64)
    oled.begin()
    oled.setTextColor(1)

    oled.println('x')
    expect(oled.getCursorY()).toBe(8)
    oled.print('y'.repeat(22))
    // 21 characters of 6 px fit in 128; the 22nd wraps to x = 0 one row down.
    expect(oled.getCursorY()).toBe(16)
    expect(oled.getCursorX()).toBe(6)
  })

  it('shows a frame only on display(): logs its hash and text, and charges the transfer', () => {
    const { $, clock, log } = createBoard()
    const oled = $.hw.Adafruit_SSD1306(128, 64)
    oled.begin()
    oled.setTextColor(1)
    const before = clock.now

    oled.print('Hi')
    expect(log.entries.filter((e) => e.dev === 'oled')).toEqual([])
    oled.display()

    const frame = log.entries.filter((e) => e.dev === 'oled')
    expect(frame.map((e) => e.key)).toEqual(['frame', 'text'])
    expect(frame[1].value).toBe('Hi')
    // At 400 kHz: the address window (157 us), the column end (67 us), then 1024 bytes as eight
    // transmissions of 127 (2902 us each) and one of 8 (225 us).
    expect(clock.now - before).toBe(157 + 67 + 8 * 2902 + 225)
  })

  it('clears the buffer and the text record on clearDisplay()', () => {
    const { $, log } = createBoard()
    const oled = $.hw.Adafruit_SSD1306(128, 64)
    oled.begin()
    oled.setTextColor(1)
    oled.print('Hi')
    oled.display()

    oled.clearDisplay()
    oled.display()

    expect(oled.getBuffer().every((b) => b === 0)).toBe(true)
    expect(log.entries.filter((e) => e.key === 'text').map((e) => e.value)).toEqual(['Hi', ''])
  })
})
