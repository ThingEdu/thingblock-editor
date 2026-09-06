/**
 * ThingBot C3 Arduino codegen using the editor's shared generator buckets. The PS2 block relies on the
 * separate PS2 peripheral for `PS2X_lib.h`.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterGenerators } from '../../../shared/types'

/** Semitone offset of each note name within its octave, for the equal-tempered frequency. */
const SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
}

/**
 * Equal-tempered frequency of a note, rounded to whole Hz because that is the resolution the
 * PCA9685 prescaler offers anyway. A4 = 440 Hz is MIDI number 69.
 * @param note The note name, e.g. `C#`.
 * @param octave The octave number, e.g. `4`.
 * @returns The frequency in Hz.
 */
const noteFrequency = (note: string, octave: string): number => {
  const midi = (Number(octave) + 1) * 12 + (SEMITONES[note] ?? 0)
  return Math.round(440 * Math.pow(2, (midi - 69) / 12))
}

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' ? value : fallback
  }

  generator.forBlock.thingBotC3_init = () => {
    generator.includes.set('thingbot_pwm', '#include <Wire.h>\n#include <Adafruit_PWMServoDriver.h>')
    generator.globals.set(
      'thingbot_pins',
      [
        '#define M1_A 2',
        '#define M1_B 3',
        '#define M2_A 4',
        '#define M2_B 5',
        '#define M3_A 7',
        '#define M3_B 6',
        '#define M4_A 1',
        '#define M4_B 0',
        '#define SERVO_1 12',
        '#define SERVO_2 11',
        '#define SERVO_3 10',
        '#define SERVO_4 9',
        '#define SERVO_5 8',
        '#define BUZZER 14',
        '#define SW 3',
        '#define LED_1 15',
        '#define LED_2 13',
      ].join('\n'),
    )
    generator.globals.set('thingbot_pwm', 'Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();')
    generator.globals.set(
      'thingbot_map_to_pulse',
      'int mapToPulse(int value) {\n\treturn map(min(100, max(0, value)), 0, 100, 0, 4095);\n}',
    )
    return 'pwm.begin();\npwm.setOscillatorFrequency(27000000);\npwm.setPWMFreq(50);\npinMode(SW, INPUT);\n'
  }

  generator.forBlock.thingBotC3_setMotor = (block) => {
    const motor = fieldValue(block, 'MOTOR', '1')
    const direction = fieldValue(block, 'DIRECTION', 'forward')
    const speed = generator.valueToCode(block, 'SPEED', Order.ATOMIC) || '0'
    if (direction === 'forward') {
      return `pwm.setPWM(M${motor}_A, 0, 0);\npwm.setPWM(M${motor}_B, 0, mapToPulse(${speed}));\n`
    }
    return `pwm.setPWM(M${motor}_A, 0, mapToPulse(${speed}));\npwm.setPWM(M${motor}_B, 0, 0);\n`
  }

  generator.forBlock.thingBotC3_setServo = (block) => {
    const servo = fieldValue(block, 'SERVO', '1')
    const pulse = generator.valueToCode(block, 'PULSE', Order.ATOMIC) || '0'
    return `pwm.setPWM(SERVO_${servo}, 0, ${pulse});\n`
  }

  generator.forBlock.thingBotC3_buzzer = (block) => {
    const sound = generator.valueToCode(block, 'SOUND', Order.ATOMIC) || '0'
    return `pwm.setPin(BUZZER, 0, ${sound});\n`
  }

  /**
   * Shared C helpers for the music blocks. The buzzer is a passive one on PCA9685 channel 14, so its
   * pitch is the chip's PWM frequency — and that prescaler is shared by all 16 channels, which is why
   * every note ends by restoring the 50 Hz servo frame rather than leaving servos on a broken frame.
   */
  const registerMusicHelpers = () => {
    generator.globals.set(
      'thingbot_music',
      [
        'int musicBPM = 120;',
        'void musicPlay(int hz, float beats) {',
        '\tint ms = (int)(beats * (60000.0 / musicBPM));',
        '\tif (hz > 0) {',
        '\t\tpwm.setPWMFreq(hz);',
        '\t\tpwm.setPWM(BUZZER, 0, 2048);  // 50% duty: a square wave, the loudest a passive buzzer gets',
        '\t}',
        '\tdelay(ms > 50 ? ms - 50 : ms);',
        '\tpwm.setPWM(BUZZER, 0, 0);',
        '\tpwm.setPWMFreq(50);',
        '\tdelay(50);  // the gap that keeps two notes of the same pitch from running together',
        '}',
      ].join('\n'),
    )
  }

  generator.forBlock.thingBotC3_setTempo = (block) => {
    const tempo = generator.valueToCode(block, 'TEMPO', Order.ATOMIC) || '120'
    registerMusicHelpers()
    return `musicBPM = ${tempo};\n`
  }

  generator.forBlock.thingBotC3_playNote = (block) => {
    const note = fieldValue(block, 'NOTE', 'C')
    const octave = fieldValue(block, 'OCTAVE', '4')
    const beats = generator.valueToCode(block, 'BEATS', Order.ATOMIC) || '1'
    registerMusicHelpers()
    return `musicPlay(${noteFrequency(note, octave)}, ${beats});\n`
  }

  generator.forBlock.thingBotC3_rest = (block) => {
    const beats = generator.valueToCode(block, 'BEATS', Order.ATOMIC) || '1'
    registerMusicHelpers()
    return `musicPlay(0, ${beats});\n`
  }

  generator.forBlock.thingBotC3_setLed = (block) => {
    const led = fieldValue(block, 'LED', 'LED_1')
    const brightness = generator.valueToCode(block, 'BRIGHTNESS', Order.ATOMIC) || '0'
    return `pwm.setPin(${led}, mapToPulse(${brightness}));\n`
  }

  generator.forBlock.thingBotC3_initPS2 = () => {
    generator.includes.set('ps2x_include', '#include <PS2X_lib.h>')
    generator.globals.set(
      'thingbot_ps2_pins',
      [
        '#define PS2_DAT 7   // DIN',
        '#define PS2_CMD 2   // DOUT',
        '#define PS2_SEL 10  // CS',
        '#define PS2_CLK 6   // CLK',
        '#define pressures false',
        '#define rumble false',
      ].join('\n'),
    )
    generator.globals.set('ps2x_instance', 'PS2X ps2x;')
    generator.globals.set('thingbot_ps2_config', 'int error = 1;\nint tryNum = 1;')
    return [
      'while (error != 0) {',
      '\tdelay(1000);',
      '\terror = ps2x.config_gamepad(PS2_CLK, PS2_CMD, PS2_SEL, PS2_DAT, pressures, rumble);',
      '\tSerial.print("#try config ");',
      '\tSerial.println(tryNum);',
      '\ttryNum++;',
      '}',
      '',
    ].join('\n')
  }

  generator.forBlock.thingBotC3_switch = () => ['!digitalRead(SW)', Order.ATOMIC]
}
