/**
 * ThingBot C3 simulator codegen: the same calls as `generator.ts`, on the simulator's virtual PCA9685.
 * The pin `#define`s become constants and `mapToPulse` a function with the C++ `int` semantics, so a
 * block drives the same channel with the same duty in both builds. Blocks not listed here have no
 * simulation yet; the editor reports them as such instead of running the program.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterSimGenerators } from '../../../shared/types'

const PINS = [
  'const M1_A = 2, M1_B = 3, M2_A = 4, M2_B = 5, M3_A = 7, M3_B = 6, M4_A = 1, M4_B = 0;',
  'const SERVO_1 = 12, SERVO_2 = 11, SERVO_3 = 10, SERVO_4 = 9, SERVO_5 = 8;',
  'const BUZZER = 14, SW = 3, LED_1 = 15, LED_2 = 13;',
].join('\n')

/**
 * `noteFrequency` of `generator.ts`. Each pack entry is built as its own module, so the simulator keeps
 * a copy instead of importing the generator; the parity test checks both agree on every menu note.
 * @param note The note name, e.g. `C#`.
 * @param octave The octave number, e.g. `4`.
 * @returns The frequency in Hz.
 */
export const noteFrequency = (note: string, octave: string): number => {
  const semitone = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(note)
  const midi = (Number(octave) + 1) * 12 + Math.max(0, semitone)
  return Math.round(440 * Math.pow(2, (midi - 69) / 12))
}

/** `servoSetAngle`, `servoMoveTo`, `servoStart`… from `generator.ts`, line for line with C++ `int` math. */
const SERVO_HELPERS = [
  'const SERVO_PULSE_MIN = 102, SERVO_PULSE_MAX = 512;',
  'const servoAngle = new Array(16).fill(90);',
  'function servoSetAngle(ch, deg) {',
  '  deg = $.constrain(deg, 0, 180);',
  '  pwm.setPWM(ch, 0, $.map(deg, 0, 180, SERVO_PULSE_MIN, SERVO_PULSE_MAX));',
  '  servoAngle[ch] = deg;',
  '}',
  'function* servoMoveTo(ch, deg, seconds) {',
  '  const from = servoAngle[ch];',
  '  const steps = Math.max(1, $.toInt(seconds * 50));',
  '  for (let i = 1; i <= steps; i++) {',
  '    servoSetAngle(ch, $.i32(from + $.idiv($.imul($.i32(deg - from), i), steps)));',
  '    yield $.delay(20);',
  '  }',
  '}',
  'const servoMotion = Array.from({ length: 16 }, () => ({ from: 0, to: 0, start: 0, dur: 0, active: false }));',
  'function servoStart(ch, deg, seconds) {',
  '  const m = servoMotion[ch];',
  '  m.from = servoAngle[ch];',
  '  m.to = deg;',
  '  m.start = $.millis();',
  '  m.dur = seconds > 0 ? $.toUlong(seconds * 1000) : 0;',
  '  m.active = true;',
  '}',
  'function servoTickAll() {',
  '  let running = false;',
  '  for (let ch = 0; ch < 16; ch++) {',
  '    const m = servoMotion[ch];',
  '    if (!m.active) continue;',
  '    const elapsed = ($.millis() - m.start) >>> 0;',
  '    if (m.dur === 0 || elapsed >= m.dur) {',
  '      servoSetAngle(ch, m.to);',
  '      m.active = false;',
  '    } else {',
  '      servoSetAngle(ch, $.i32(m.from + $.idiv($.imul($.i32(m.to - m.from), $.i32(elapsed)), $.i32(m.dur))));',
  '      running = true;',
  '    }',
  '  }',
  '  return running;',
  '}',
  'function* servoWaitAll() {',
  '  while (servoTickAll()) yield $.delay(20);',
  '}',
  'function servoRelease(ch) {',
  '  pwm.setPWM(ch, 0, 4096);',
  '}',
].join('\n')

/** `musicPlay` from `generator.ts`: the pitch is the PCA9685 frequency, restored to 50 Hz after each note. */
const MUSIC_HELPERS = [
  'let musicBPM = 120;',
  'function* musicPlay(hz, beats) {',
  '  const ms = $.toInt(beats * (60000.0 / musicBPM));',
  '  if (hz > 0) {',
  '    pwm.setPWMFreq(hz);',
  '    pwm.setPWM(BUZZER, 0, 2048);',
  '  }',
  '  yield $.delay(ms > 50 ? ms - 50 : ms);',
  '  pwm.setPWM(BUZZER, 0, 0);',
  '  pwm.setPWMFreq(50);',
  '  yield $.delay(50);',
  '}',
].join('\n')

export const registerSimGenerators: RegisterSimGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' ? value : fallback
  }

  /** The globals and setup `generator.ts` emits through `registerBoardHardware()`. */
  const registerBoardHardware = (): void => {
    generator.globals.set('thingbot_pins', PINS)
    generator.globals.set('thingbot_pwm', 'const pwm = $.hw.Adafruit_PWMServoDriver();')
    generator.globals.set(
      'thingbot_map_to_pulse',
      'function mapToPulse(value) {\n  return $.map(Math.min(100, Math.max(0, value)), 0, 100, 0, 4095);\n}',
    )
    generator.setups.set(
      'thingbot_pwm_init',
      ['pwm.begin();', 'pwm.setOscillatorFrequency(27000000);', 'pwm.setPWMFreq(50);', '$.pinMode(SW, 0);'].join(
        '\n',
      ),
    )
  }

  generator.forBlock.thingBotC3_init = () => {
    registerBoardHardware()
    return ''
  }

  const registerServoAngleHelpers = (): void => {
    registerBoardHardware()
    generator.globals.set('thingbot_servo_angle', SERVO_HELPERS)
  }
  const registerMusicHelpers = (): void => {
    registerBoardHardware()
    generator.globals.set('thingbot_music', MUSIC_HELPERS)
  }
  const servoChannel = (block: Block): string => `SERVO_${Number(fieldValue(block, 'SERVO', '1')) || 1}`

  generator.forBlock.thingBotC3_setMotor = (block) => {
    registerBoardHardware()
    const motor = Number(fieldValue(block, 'MOTOR', '1')) || 1
    const speed = generator.inputAs(block, 'SPEED', 'int')
    if (fieldValue(block, 'DIRECTION', 'forward') === 'forward') {
      return `pwm.setPWM(M${motor}_A, 0, 0);\npwm.setPWM(M${motor}_B, 0, mapToPulse(${speed}));`
    }
    return `pwm.setPWM(M${motor}_A, 0, mapToPulse(${speed}));\npwm.setPWM(M${motor}_B, 0, 0);`
  }

  generator.forBlock.thingBotC3_setServo = (block) => {
    registerBoardHardware()
    return `pwm.setPWM(${servoChannel(block)}, 0, ${generator.inputAs(block, 'PULSE', 'int')});`
  }

  generator.forBlock.thingBotC3_setServoAngle = (block) => {
    registerServoAngleHelpers()
    return `servoSetAngle(${servoChannel(block)}, ${generator.inputAs(block, 'ANGLE', 'int', '90')});`
  }

  generator.forBlock.thingBotC3_moveServoAngle = (block) => {
    registerServoAngleHelpers()
    const angle = generator.inputAs(block, 'ANGLE', 'int', '90')
    const seconds = generator.inputAs(block, 'SECONDS', 'float', '1')
    return `yield* servoMoveTo(${servoChannel(block)}, ${angle}, ${seconds});`
  }

  generator.forBlock.thingBotC3_startServoAngle = (block) => {
    registerServoAngleHelpers()
    const angle = generator.inputAs(block, 'ANGLE', 'int', '90')
    const seconds = generator.inputAs(block, 'SECONDS', 'float', '1')
    return `servoStart(${servoChannel(block)}, ${angle}, ${seconds});`
  }

  generator.forBlock.thingBotC3_waitServos = () => {
    registerServoAngleHelpers()
    return 'yield* servoWaitAll();'
  }

  generator.forBlock.thingBotC3_releaseServo = (block) => {
    registerServoAngleHelpers()
    return `servoRelease(${servoChannel(block)});`
  }

  // C++: `pwm.setPin(BUZZER, 0, sound)`: the value is 0 and `sound` is the invert flag, so any
  // non-zero sound drives the channel fully on.
  generator.forBlock.thingBotC3_buzzer = (block) => {
    registerBoardHardware()
    return `pwm.setPin(BUZZER, 0, ${generator.inputAs(block, 'SOUND', 'int')} !== 0);`
  }

  generator.forBlock.thingBotC3_setTempo = (block) => {
    registerMusicHelpers()
    return `musicBPM = ${generator.inputAs(block, 'TEMPO', 'int', '120')};`
  }

  generator.forBlock.thingBotC3_playNote = (block) => {
    registerMusicHelpers()
    const hz = noteFrequency(fieldValue(block, 'NOTE', 'C'), fieldValue(block, 'OCTAVE', '4'))
    return `yield* musicPlay(${hz}, ${generator.inputAs(block, 'BEATS', 'float', '1')});`
  }

  generator.forBlock.thingBotC3_rest = (block) => {
    registerMusicHelpers()
    return `yield* musicPlay(0, ${generator.inputAs(block, 'BEATS', 'float', '1')});`
  }

  generator.forBlock.thingBotC3_setLed = (block) => {
    registerBoardHardware()
    const led = fieldValue(block, 'LED', 'LED_1') === 'LED_2' ? 'LED_2' : 'LED_1'
    // mapToPulse takes an int, so a fractional brightness truncates on the way in.
    const brightness = generator.inputAs(block, 'BRIGHTNESS', 'int')
    return `pwm.setPin(${led}, mapToPulse(${brightness}));`
  }

  generator.forBlock.thingBotC3_switch = () => {
    registerBoardHardware()
    return ['!$.digitalRead(SW)', Order.ATOMIC]
  }
  generator.typeFor.thingBotC3_switch = () => 'bool'
}
