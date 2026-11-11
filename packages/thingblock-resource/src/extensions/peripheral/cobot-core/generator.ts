/**
 * CoBot Arduino codegen. The board is an ESP32-C3 with an MX1508 driver per wheel: each wheel has an A and
 * a B pin, PWM at 5 kHz with 8-bit duty as in makerviet/cobot-arduino. Forward puts the duty on A with B
 * at 0, backward the reverse. The four eyes are QRE1113 reflectance sensors on ADC pins (0–4095); IO21
 * switches their IR emitters and IO20 the white LED that lights the floor for the colour sensor.
 *
 * Every hardware block registers the board setup itself (fixed keys, so it lands once), so a program
 * works with or without `start CoBot`; the setup runs before the learner's `when Arduino starts` code.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import type { RegisterGenerators } from '../../../shared/types'
import { MOVES } from './blocks'

/** Motor pins: left A/B, right A/B. */
export const MOTOR_PINS = { leftA: 2, leftB: 10, rightA: 6, rightB: 5 }
/** Eye 1…4 analog pins, left to right. */
export const EYE_PINS = [4, 3, 1, 0]
export const IR_LIGHT_PIN = 21
export const WHITE_LIGHT_PIN = 20
/** The line threshold of the maker's line-following sample: a reading at or below it is the line. */
export const DEFAULT_LINE_THRESHOLD = 2000

/** Left and right wheel speed, as multiples of the block's speed, for each way the car moves. */
export const MOVE_WHEELS: Record<string, [number, number]> = {
  forward: [1, 1],
  backward: [-1, -1],
  turnLeft: [0, 1],
  turnRight: [1, 0],
  spinLeft: [-1, 1],
  spinRight: [1, -1],
}

const MOVE_VALUES = new Set(MOVES.map(([, value]) => value))

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' ? value : fallback
  }
  const eye = (block: Block): number => Math.min(4, Math.max(1, Number(fieldValue(block, 'EYE', '1')) || 1))
  const level = (block: Block) => (fieldValue(block, 'STATE', 'HIGH') === 'LOW' ? 'LOW' : 'HIGH')

  const registerBoard = (): void => {
    generator.globals.set(
      'cobot_board',
      [
        '// CoBot: chân nối trên mạch ESP32-C3',
        `#define COBOT_LEFT_A ${MOTOR_PINS.leftA}  // động cơ trái, chân A (cấp xung thì bánh tiến)`,
        `#define COBOT_LEFT_B ${MOTOR_PINS.leftB}  // động cơ trái, chân B (cấp xung thì bánh lùi)`,
        `#define COBOT_RIGHT_A ${MOTOR_PINS.rightA}  // động cơ phải, chân A (tiến)`,
        `#define COBOT_RIGHT_B ${MOTOR_PINS.rightB}  // động cơ phải, chân B (lùi)`,
        `#define COBOT_IR_LIGHT ${IR_LIGHT_PIN}  // đèn hồng ngoại của 4 mắt: HIGH là bật`,
        `#define COBOT_WHITE_LIGHT ${WHITE_LIGHT_PIN}  // đèn trắng soi sàn cho cảm biến màu`,
        `const uint8_t cobotEyePins[4] = {${EYE_PINS.join(', ')}};  // mắt 1..4 từ trái sang phải`,
        'int cobotTrim = 0;  // bánh phải nhanh hơn bánh trái bao nhiêu % (số âm: chậm hơn)',
        `int cobotLineThreshold = ${DEFAULT_LINE_THRESHOLD};  // ngưỡng chia vạch và nền (số đọc 0..4095)`,
        'bool cobotLineBelow = true;  // true: số đọc <= ngưỡng là thấy vạch; false: >= ngưỡng',
        '// Quay một bánh với tốc độ -100..100 %: tiến thì cấp xung chân A, lùi thì chân B.',
        'void cobotMotor(uint8_t pinA, uint8_t pinB, int speed) {',
        '\tspeed = constrain(speed, -100, 100);',
        '\tint duty = abs(speed) * 255 / 100;  // đổi % ra mức xung 0..255',
        '\tledcWrite(pinA, speed > 0 ? duty : 0);',
        '\tledcWrite(pinB, speed < 0 ? duty : 0);',
        '}',
        '// Quay hai bánh, bánh phải được bù lệch; nếu vượt 100 % thì giảm cả hai để giữ tỉ lệ.',
        'void cobotWheels(int left, int right) {',
        '\tleft = constrain(left, -100, 100);',
        '\tright = constrain(right, -100, 100) * (100 + cobotTrim) / 100;',
        '\tif (abs(right) > 100) {',
        '\t\tleft = left * 100 / abs(right);',
        '\t\tright = right > 0 ? 100 : -100;',
        '\t}',
        '\tcobotMotor(COBOT_LEFT_A, COBOT_LEFT_B, left);',
        '\tcobotMotor(COBOT_RIGHT_A, COBOT_RIGHT_B, right);',
        '}',
        '// Số đọc của mắt n (1..4): 0..4095, vạch tối hắt về ít hồng ngoại nên số nhỏ.',
        'int cobotEye(int n) {',
        '\treturn analogRead(cobotEyePins[constrain(n, 1, 4) - 1]);',
        '}',
        '// Mắt n có thấy vạch không: so số đọc với ngưỡng.',
        'bool cobotOnLine(int n) {',
        '\tint reading = cobotEye(n);',
        '\treturn cobotLineBelow ? reading <= cobotLineThreshold : reading >= cobotLineThreshold;',
        '}',
        '// Mẫu 4 mắt, từ mắt 1 tới mắt 4: "1" là thấy vạch. "0110" là vạch nằm dưới hai mắt giữa.',
        'String cobotPattern() {',
        '\tString pattern = "";',
        '\tfor (int n = 1; n <= 4; n++) pattern += cobotOnLine(n) ? "1" : "0";',
        '\treturn pattern;',
        '}',
        '// So mẫu 4 mắt với mẫu muốn: chữ nào không phải 0 hay 1 (ví dụ x) thì mắt đó thế nào cũng được.',
        'bool cobotPatternIs(String want) {',
        '\tString now = cobotPattern();',
        '\tfor (int i = 0; i < 4 && i < (int)want.length(); i++) {',
        '\t\tchar w = want.charAt(i);',
        "\t\tif ((w == '0' || w == '1') && w != now.charAt(i)) return false;",
        '\t}',
        '\treturn true;',
        '}',
      ].join('\n'),
    )
    generator.setups.set(
      'cobot_board',
      [
        '// CoBot: xung PWM 5 kHz, 8 bit (0..255) trên 4 chân động cơ',
        'ledcAttach(COBOT_LEFT_A, 5000, 8);',
        'ledcAttach(COBOT_LEFT_B, 5000, 8);',
        'ledcAttach(COBOT_RIGHT_A, 5000, 8);',
        'ledcAttach(COBOT_RIGHT_B, 5000, 8);',
        'pinMode(COBOT_IR_LIGHT, OUTPUT);',
        'digitalWrite(COBOT_IR_LIGHT, HIGH);  // bật đèn hồng ngoại để 4 mắt nhìn được vạch',
        'pinMode(COBOT_WHITE_LIGHT, OUTPUT);',
        'digitalWrite(COBOT_WHITE_LIGHT, LOW);  // đèn trắng tắt, bật khi cần đọc màu trong phòng tối',
      ].join('\n'),
    )
  }

  const value = (block: Block, name: string, fallback: string): string =>
    generator.valueToCode(block, name, Order.NONE) || fallback

  generator.forBlock.cobotC3_init = () => {
    registerBoard()
    return ''
  }

  generator.forBlock.cobotC3_drive = (block) => {
    registerBoard()
    const move = fieldValue(block, 'MOVE', 'forward')
    const [left, right] = MOVE_WHEELS[MOVE_VALUES.has(move) ? move : 'forward']
    const speed = value(block, 'SPEED', '0')
    // A plain number negates as `-40`; anything else (a variable, a sum, a negative literal) in brackets.
    const negated = /^\d+(\.\d+)?$/.test(speed) ? `-${speed}` : `-(${speed})`
    const wheel = (k: number) => (k === 0 ? '0' : k > 0 ? speed : negated)
    return `cobotWheels(${wheel(left)}, ${wheel(right)});\n`
  }

  generator.forBlock.cobotC3_stop = () => {
    registerBoard()
    return 'cobotWheels(0, 0);\n'
  }

  generator.forBlock.cobotC3_setMotor = (block) => {
    registerBoard()
    const side = fieldValue(block, 'MOTOR', 'left') === 'right' ? 'RIGHT' : 'LEFT'
    return `cobotMotor(COBOT_${side}_A, COBOT_${side}_B, ${value(block, 'SPEED', '0')});\n`
  }

  generator.forBlock.cobotC3_setTrim = (block) => {
    registerBoard()
    return `cobotTrim = ${value(block, 'PERCENT', '0')};\n`
  }

  generator.forBlock.cobotC3_readEye = (block) => {
    registerBoard()
    return [`cobotEye(${eye(block)})`, Order.ATOMIC]
  }

  generator.forBlock.cobotC3_onLine = (block) => {
    registerBoard()
    return [`cobotOnLine(${eye(block)})`, Order.ATOMIC]
  }

  generator.forBlock.cobotC3_setLine = (block) => {
    registerBoard()
    const below = fieldValue(block, 'SIDE', 'below') !== 'above'
    return `cobotLineBelow = ${below};\ncobotLineThreshold = ${value(block, 'THRESHOLD', String(DEFAULT_LINE_THRESHOLD))};\n`
  }

  generator.forBlock.cobotC3_pattern = () => {
    registerBoard()
    return ['cobotPattern()', Order.ATOMIC]
  }

  generator.forBlock.cobotC3_patternIs = (block) => {
    registerBoard()
    return [`cobotPatternIs(String(${value(block, 'PATTERN', '""')}))`, Order.ATOMIC]
  }

  generator.forBlock.cobotC3_irLight = (block) => {
    registerBoard()
    return `digitalWrite(COBOT_IR_LIGHT, ${level(block)});\n`
  }

  generator.forBlock.cobotC3_whiteLight = (block) => {
    registerBoard()
    return `digitalWrite(COBOT_WHITE_LIGHT, ${level(block)});\n`
  }
}
