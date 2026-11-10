/**
 * Colour sensor Arduino codegen. The TCS34725 runs continuously once started, so a reading is just its
 * four data registers (red, green, blue, clear) read straight away; the library's `getRawData` would
 * also wait one integration time (50 ms) on every call. Integration time and gain are those of
 * makerviet/cobot-arduino `cobot_simple_line_following`.
 *
 * The colour a block names comes from a few rules a learner can follow by hand with the readings:
 * 1. Too little light comes back (clear below `COLOUR_DARK`): black.
 * 2. Red, green and blue each take about a third of the light (shares within `COLOUR_EVEN` points of each
 *    other): white when bright (clear from `COLOUR_WHITE`), black otherwise.
 * 3. Red and green together take three quarters or more, about equally: yellow.
 * 4. Otherwise the biggest share wins: red, green or blue.
 */
import type { RegisterGenerators } from '../../../shared/types'
import { COLOUR_DARK, COLOUR_EVEN, COLOUR_NAMES, COLOUR_WHITE, channelIndex, colourCode } from './colours'

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const registerSensor = (): void => {
    generator.includes.set('colourSensor', '#include <Wire.h>\n#include <Adafruit_TCS34725.h>')
    generator.globals.set(
      'colourSensor',
      [
        `#define COLOUR_DARK ${COLOUR_DARK}   // clear reading below this: black`,
        `#define COLOUR_WHITE ${COLOUR_WHITE} // even light from this clear reading up: white`,
        `#define COLOUR_EVEN ${COLOUR_EVEN}    // red, green, blue shares this close (in %): even light`,
        'Adafruit_TCS34725 colourTcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);',
        'uint16_t colourRaw[4];  // red, green, blue, clear',
        'void colourSensorUpdate() {',
        '\tcolourRaw[0] = colourTcs.read16(TCS34725_RDATAL);',
        '\tcolourRaw[1] = colourTcs.read16(TCS34725_GDATAL);',
        '\tcolourRaw[2] = colourTcs.read16(TCS34725_BDATAL);',
        '\tcolourRaw[3] = colourTcs.read16(TCS34725_CDATAL);',
        '}',
        'uint16_t colourSensorRead(uint8_t channel) {',
        '\tcolourSensorUpdate();',
        '\treturn colourRaw[channel];',
        '}',
        '// 0 black, 1 red, 2 green, 3 blue, 4 yellow, 5 white',
        'int colourSensorClass() {',
        '\tcolourSensorUpdate();',
        '\tlong r = colourRaw[0], g = colourRaw[1], b = colourRaw[2], c = colourRaw[3];',
        '\tlong sum = r + g + b;',
        '\tif (c < COLOUR_DARK || sum == 0) return 0;',
        '\tlong rp = r * 100 / sum, gp = g * 100 / sum, bp = b * 100 / sum;',
        '\tlong hi = max(rp, max(gp, bp)), lo = min(rp, min(gp, bp));',
        '\tif (hi - lo <= COLOUR_EVEN) return c >= COLOUR_WHITE ? 5 : 0;',
        '\tif (rp + gp >= 75 && abs(rp - gp) <= 15) return 4;',
        '\tif (rp == hi) return 1;',
        '\tif (gp == hi) return 2;',
        '\treturn 3;',
        '}',
        'String colourSensorName() {',
        `\tconst char *names[] = {${COLOUR_NAMES.map((n) => JSON.stringify(n)).join(', ')}};`,
        '\treturn String(names[colourSensorClass()]);',
        '}',
      ].join('\n'),
    )
    generator.setups.set('colourSensor', 'colourTcs.begin();')
  }

  generator.forBlock.colourSensor_init = () => {
    registerSensor()
    return ''
  }

  generator.forBlock.colourSensor_read = (block) => {
    registerSensor()
    return [`colourSensorRead(${channelIndex(block.getFieldValue('CHANNEL'))})`, Order.ATOMIC]
  }

  generator.forBlock.colourSensor_is = (block) => {
    registerSensor()
    return [`(colourSensorClass() == ${colourCode(block.getFieldValue('COLOUR'))})`, Order.ATOMIC]
  }

  generator.forBlock.colourSensor_name = () => {
    registerSensor()
    return ['colourSensorName()', Order.ATOMIC]
  }
}
