/**
 * Adafruit_SSD1306 and the parts of Adafruit_GFX it inherits, ported for the simulator. The buffer has
 * the driver's page layout (one byte holds eight vertical pixels, `x + (y / 8) * width`), so a frame
 * hashes the same here as the C++ parity build's real driver buffer. Drawing changes only the buffer;
 * like the real driver, nothing reaches the panel until `display()`. The SH1106 driver shares this
 * drawing API and buffer layout, so the simulator models both chips with this one class.
 */
import type { EventLog } from '../runtime'
import COSTS from './costs.json'
import { FONT_5X7 } from './font5x7'
import type { I2cBus } from './i2c'
import { SPLASH_128X32, SPLASH_128X64 } from './splash'

export const SSD1306_BLACK = 0
export const SSD1306_WHITE = 1
export const SSD1306_INVERSE = 2

/** Adafruit_GFX's initial text colour: neither WHITE, BLACK nor INVERSE, so SSD1306 draws nothing. */
const GFX_DEFAULT_COLOUR = 0xffff

/** `WIRE_MAX` on the ESP32: the core's 128-byte Wire buffer bounds each transmission. */
const WIRE_MAX = 128

/**
 * Payload lengths of the command transmissions `begin()` sends for a 128x64 panel on the internal
 * charge pump: three four-command lists and the two-byte single commands between them, then the last
 * six-command list. Each list carries a leading control byte.
 */
const BEGIN_TRANSMISSIONS = [5, 2, 5, 2, 5, 2, 2, 2, 2, 2, 2, 7]

/** FNV-1a over the frame buffer: a short, stable name for a frame in the event log. */
const hashFrame = (buffer: Uint8Array): string => {
  let h = 0x811c9dc5
  for (const byte of buffer) {
    h ^= byte
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export class Ssd1306 {
  readonly width: number
  readonly height: number
  readonly name: string
  private readonly log: EventLog
  private readonly bus: I2cBus
  private readonly buffer: Uint8Array
  /** The frame last sent with `display()`: what the panel shows. */
  private shown: Uint8Array
  private cursorX = 0
  private cursorY = 0
  private textSizeX = 1
  private textSizeY = 1
  private textColour = GFX_DEFAULT_COLOUR
  private textBg = GFX_DEFAULT_COLOUR
  private wrap = true
  /** Text printed since the last `clearDisplay()`, for the checker's "the screen says…" rules. */
  private text = ''

  constructor(width: number, height: number, log: EventLog, bus: I2cBus, name = 'oled') {
    this.width = width
    this.height = height
    this.log = log
    this.bus = bus
    this.name = name
    this.buffer = new Uint8Array(width * ((height + 7) >> 3))
    this.shown = this.buffer.slice()
  }

  /**
   * `begin()`: clear the buffer and draw the Adafruit splash into it, as the driver does, then send the
   * panel its init commands. The splash only reaches the panel with the first `display()`.
   * @returns True, as the driver does once its buffer is allocated.
   */
  begin(): boolean {
    this.buffer.fill(0)
    const splash = this.height > 32 ? SPLASH_128X64 : SPLASH_128X32
    this.drawBitmap((this.width - splash.width) >> 1, (this.height - splash.height) >> 1, splash, SSD1306_WHITE)
    this.transaction(() => {
      for (const payload of BEGIN_TRANSMISSIONS) this.bus.transfer(payload)
    })
    return true
  }

  /** `Adafruit_GFX::drawBitmap` for a PROGMEM bitmap: set pixels draw `colour`, clear ones are left alone. */
  drawBitmap(x: number, y: number, bitmap: { width: number; height: number; data: Uint8Array }, colour: number): void {
    const byteWidth = (bitmap.width + 7) >> 3
    let byte = 0
    for (let j = 0; j < bitmap.height; j++) {
      for (let i = 0; i < bitmap.width; i++) {
        if (i & 7) byte = (byte << 1) & 0xff
        else byte = bitmap.data[j * byteWidth + (i >> 3)]
        if (byte & 0x80) this.drawPixel(x + i, y + j, colour)
      }
    }
  }

  /** The driver speeds the bus up for its own transfers and restores the default afterwards. */
  private transaction(body: () => void): void {
    this.bus.clockHz = COSTS.ssd1306ClockHz
    body()
    this.bus.clockHz = COSTS.i2cDefaultHz
  }

  getBuffer(): Uint8Array {
    return this.buffer
  }

  /** The frame the panel shows, for the rig to draw. */
  getShownFrame(): Uint8Array {
    return this.shown
  }

  getCursorX(): number {
    return this.cursorX
  }

  getCursorY(): number {
    return this.cursorY
  }

  clearDisplay(): void {
    this.buffer.fill(0)
    this.text = ''
  }

  display(): void {
    this.transaction(() => {
      // PAGEADDR/COLUMNADDR as a five-command list, the column end as a single command, then the
      // buffer in transmissions of a control byte and up to WIRE_MAX - 1 data bytes.
      this.bus.transfer(6)
      this.bus.transfer(2)
      for (let left = this.buffer.length; left > 0; left -= WIRE_MAX - 1) {
        this.bus.transfer(1 + Math.min(left, WIRE_MAX - 1))
      }
    })
    this.shown = this.buffer.slice()
    this.log.record(this.name, 'frame', hashFrame(this.shown))
    this.log.record(this.name, 'text', this.text)
  }

  drawPixel(x: number, y: number, colour: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return
    const i = x + (y >> 3) * this.width
    const bit = 1 << (y & 7)
    if (colour === SSD1306_WHITE) this.buffer[i] |= bit
    else if (colour === SSD1306_BLACK) this.buffer[i] &= ~bit
    else if (colour === SSD1306_INVERSE) this.buffer[i] ^= bit
  }

  fillRect(x: number, y: number, w: number, h: number, colour: number): void {
    for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) this.drawPixel(i, j, colour)
  }

  drawRect(x: number, y: number, w: number, h: number, colour: number): void {
    this.fillRect(x, y, w, 1, colour)
    this.fillRect(x, y + h - 1, w, 1, colour)
    this.fillRect(x, y + 1, 1, h - 2, colour)
    this.fillRect(x + w - 1, y + 1, 1, h - 2, colour)
  }

  fillScreen(colour: number): void {
    this.fillRect(0, 0, this.width, this.height, colour)
  }

  setCursor(x: number, y: number): void {
    this.cursorX = x
    this.cursorY = y
  }

  setTextSize(sx: number, sy = sx): void {
    this.textSizeX = sx > 0 ? sx : 1
    this.textSizeY = sy > 0 ? sy : 1
  }

  /** `setTextColor(c)` draws transparent text (background = foreground); `(c, bg)` paints the background. */
  setTextColor(colour: number, bg = colour): void {
    this.textColour = colour
    this.textBg = bg
  }

  setTextWrap(wrap: boolean): void {
    this.wrap = wrap
  }

  /** `Adafruit_GFX::drawChar`, classic font branch. */
  drawChar(x: number, y: number, code: number, colour: number, bg: number, sx: number, sy: number): void {
    if (x >= this.width || y >= this.height || x + 6 * sx - 1 < 0 || y + 8 * sy - 1 < 0) return
    // The classic font skips glyph 176 unless cp437 mode is on, which the blocks never enable.
    const c = code >= 176 ? code + 1 : code
    for (let i = 0; i < 5; i++) {
      let line = FONT_5X7[c * 5 + i]
      for (let j = 0; j < 8; j++, line >>= 1) {
        if (line & 1) {
          if (sx === 1 && sy === 1) this.drawPixel(x + i, y + j, colour)
          else this.fillRect(x + i * sx, y + j * sy, sx, sy, colour)
        } else if (bg !== colour) {
          if (sx === 1 && sy === 1) this.drawPixel(x + i, y + j, bg)
          else this.fillRect(x + i * sx, y + j * sy, sx, sy, bg)
        }
      }
    }
    if (bg !== colour) this.fillRect(x + 5 * sx, y, sx, 8 * sy, bg)
  }

  /** `Adafruit_GFX::write`, classic font branch: one byte of text at the cursor. */
  write(code: number): void {
    if (code === 0x0a) {
      this.cursorX = 0
      this.cursorY += this.textSizeY * 8
    } else if (code !== 0x0d) {
      if (this.wrap && this.cursorX + this.textSizeX * 6 > this.width) {
        this.cursorX = 0
        this.cursorY += this.textSizeY * 8
      }
      this.drawChar(this.cursorX, this.cursorY, code, this.textColour, this.textBg, this.textSizeX, this.textSizeY)
      this.cursorX += this.textSizeX * 6
    }
  }

  /**
   * `Print::print` with text the generator has already formatted the way the core formats its argument
   * type. Characters outside one byte are sent as `?`, since the board's font has one glyph per byte.
   */
  print(text: string): void {
    for (const ch of text) {
      const code = ch.codePointAt(0) ?? 0x3f
      this.write(code < 256 ? code : 0x3f)
    }
    this.text += text
  }

  println(text = ''): void {
    this.print(`${text}\r\n`)
  }

  // Hardware scrolling is not simulated: the panel scrolls its own RAM, outside the frame buffer.
  startscrollright(): void {}
  startscrollleft(): void {}
  startscrolldiagright(): void {}
  startscrolldiagleft(): void {}
  stopscroll(): void {}
}
