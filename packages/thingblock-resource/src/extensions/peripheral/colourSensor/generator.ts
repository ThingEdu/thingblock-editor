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
        '// Cảm biến màu TCS34725 trên dây I2C (địa chỉ 0x29; trên ThingBot và CoBot là SDA IO8, SCL IO9)',
        `#define COLOUR_DARK ${COLOUR_DARK}  // độ sáng dưới mức này: màu đen`,
        `#define COLOUR_WHITE ${COLOUR_WHITE}  // ba màu đều nhau và độ sáng từ mức này: màu trắng`,
        `#define COLOUR_EVEN ${COLOUR_EVEN}  // ba màu chênh nhau không quá chừng này %: coi như đều nhau`,
        'Adafruit_TCS34725 colourTcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);',
        'uint16_t colourRaw[4];  // đỏ, xanh lá, xanh dương, độ sáng (0..65535)',
        '// Lấy 4 số đo mới nhất: cảm biến tự đo liên tục sau khi khởi động.',
        'void colourSensorUpdate() {',
        '\tcolourRaw[0] = colourTcs.read16(TCS34725_RDATAL);',
        '\tcolourRaw[1] = colourTcs.read16(TCS34725_GDATAL);',
        '\tcolourRaw[2] = colourTcs.read16(TCS34725_BDATAL);',
        '\tcolourRaw[3] = colourTcs.read16(TCS34725_CDATAL);',
        '}',
        '// Số đọc một kênh: 0 đỏ, 1 xanh lá, 2 xanh dương, 3 độ sáng.',
        'uint16_t colourSensorRead(uint8_t channel) {',
        '\tcolourSensorUpdate();',
        '\treturn colourRaw[channel];',
        '}',
        '// Đoán màu đang thấy, trả về mã: 0 đen, 1 đỏ, 2 xanh lá, 3 xanh dương, 4 vàng, 5 trắng.',
        'int colourSensorClass() {',
        '\tcolourSensorUpdate();',
        '\tlong r = colourRaw[0], g = colourRaw[1], b = colourRaw[2], c = colourRaw[3];',
        '\tlong sum = r + g + b;',
        '\tif (c < COLOUR_DARK || sum == 0) return 0;  // quá ít ánh sáng hắt về: đen',
        '\tlong rp = r * 100 / sum, gp = g * 100 / sum, bp = b * 100 / sum;  // phần trăm mỗi màu',
        '\tlong hi = max(rp, max(gp, bp)), lo = min(rp, min(gp, bp));',
        '\tif (hi - lo <= COLOUR_EVEN) return c >= COLOUR_WHITE ? 5 : 0;  // ba màu đều nhau: sáng là trắng, tối là đen',
        '\tif (rp + gp >= 75 && abs(rp - gp) <= 15) return 4;  // đỏ và xanh lá cùng nhiều: vàng',
        '\tif (rp == hi) return 1;  // còn lại: màu nào nhiều nhất thì thắng',
        '\tif (gp == hi) return 2;',
        '\treturn 3;',
        '}',
        '// Tên màu đang thấy, bằng tiếng Việt.',
        'String colourSensorName() {',
        `\tconst char *names[] = {${COLOUR_NAMES.map((n) => JSON.stringify(n)).join(', ')}};`,
        '\treturn String(names[colourSensorClass()]);',
        '}',
      ].join('\n'),
    )
    generator.setups.set('colourSensor', 'colourTcs.begin();  // khởi động cảm biến màu')
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
