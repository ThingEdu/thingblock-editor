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
        `#define COBOT_LEFT_A ${MOTOR_PINS.leftA}`,
        `#define COBOT_LEFT_B ${MOTOR_PINS.leftB}`,
        `#define COBOT_RIGHT_A ${MOTOR_PINS.rightA}`,
        `#define COBOT_RIGHT_B ${MOTOR_PINS.rightB}`,
        `#define COBOT_IR_LIGHT ${IR_LIGHT_PIN}`,
        `#define COBOT_WHITE_LIGHT ${WHITE_LIGHT_PIN}`,
        `const uint8_t cobotEyePins[4] = {${EYE_PINS.join(', ')}};`,
        'int cobotTrim = 0;  // % the right wheel runs faster than the left (negative: slower)',
        `int cobotLineThreshold = ${DEFAULT_LINE_THRESHOLD};`,
        'bool cobotLineBelow = true;  // the line reads at or below the threshold',
        '// One wheel at -100…100 %: forward drives A, backward drives B.',
        'void cobotMotor(uint8_t pinA, uint8_t pinB, int speed) {',
        '\tspeed = constrain(speed, -100, 100);',
        '\tint duty = abs(speed) * 255 / 100;',
        '\tledcWrite(pinA, speed > 0 ? duty : 0);',
        '\tledcWrite(pinB, speed < 0 ? duty : 0);',
        '}',
        '// Both wheels, the right one trimmed; past 100 % both slow down together so the ratio holds.',
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
        'int cobotEye(int n) {',
        '\treturn analogRead(cobotEyePins[constrain(n, 1, 4) - 1]);',
        '}',
        'bool cobotOnLine(int n) {',
        '\tint reading = cobotEye(n);',
        '\treturn cobotLineBelow ? reading <= cobotLineThreshold : reading >= cobotLineThreshold;',
        '}',
        '// Eye 1 to eye 4, "1" where the eye sees the line: "0110" is the line under the middle eyes.',
        'String cobotPattern() {',
        '\tString pattern = "";',
        '\tfor (int n = 1; n <= 4; n++) pattern += cobotOnLine(n) ? "1" : "0";',
        '\treturn pattern;',
        '}',
        '// Any character but 0 and 1 (say x) matches either.',
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
        'ledcAttach(COBOT_LEFT_A, 5000, 8);',
        'ledcAttach(COBOT_LEFT_B, 5000, 8);',
        'ledcAttach(COBOT_RIGHT_A, 5000, 8);',
        'ledcAttach(COBOT_RIGHT_B, 5000, 8);',
        'pinMode(COBOT_IR_LIGHT, OUTPUT);',
        'digitalWrite(COBOT_IR_LIGHT, HIGH);',
        'pinMode(COBOT_WHITE_LIGHT, OUTPUT);',
        'digitalWrite(COBOT_WHITE_LIGHT, LOW);',
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
