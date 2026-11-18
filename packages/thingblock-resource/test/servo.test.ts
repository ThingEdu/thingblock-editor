import { describe, expect, it } from 'vitest'
import thingbotManifest from '../src/extensions/devices/thingbot/manifest'
import { registerGenerators } from '../src/extensions/peripheral/servo/generator'
import { registerGenerators as registerThingbotGenerators } from '../src/extensions/peripheral/thingbot-core/generator'
import thingbotCoreManifest from '../src/extensions/peripheral/thingbot-core/manifest'
import type { ArduinoGenerator, ArduinoOrder } from '../src/shared/types'

// Minimal stand-ins for the editor's injected instances: the order enum the pack reads and a generator
// whose buckets we can inspect. valueToCode returns the fake block's per-input source.
const Order = { ATOMIC: 0, NONE: 99 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  loopHooks: new Map<string, string>(),
  valueToCode: (block: { values: Record<string, string> }, name: string) => block.values[name] ?? '',
})

const makeBlock = (values: Record<string, string> = {}, fields: Record<string, string> = {}) => ({
  values,
  getFieldValue: (name: string) => fields[name],
})

describe('servo generator', () => {
  it('emits the include, one Servo object, its attach, and the write call', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.servo_setangle({ values: { PIN: '9', ANGLE: '90' } })

    expect(code).toBe('servo_9.write(90);\n')
    expect(gen.includes.get('servo')).toBe(
      '#if defined(ARDUINO_ARCH_ESP32)\n#include <ESP32Servo.h>\n#else\n#include <Servo.h>\n#endif',
    )
    expect(gen.globals.get('servo_9')).toBe('Servo servo_9;')
    expect(gen.setups.get('servo_9_attach')).toBe('servo_9.attach(9);')
  })

  it('falls back to default pin and angle when inputs are empty', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.servo_setangle({ values: {} })

    expect(code).toBe('servo_9.write(90);\n')
    expect(gen.globals.get('servo_9')).toBe('Servo servo_9;')
  })
})

describe('thingbot-core peripheral', () => {
  it('registers the ThingBot PWM declarations and boot-time setup', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.thingBotC3_init(makeBlock())

    expect(gen.includes.get('thingbot_pwm')).toContain('#include <Adafruit_PWMServoDriver.h>')
    expect(gen.globals.get('thingbot_pins')).toContain('#define SERVO_5 8')
    expect(gen.globals.get('thingbot_pwm')).toContain('Adafruit_PWMServoDriver pwm')
    expect(gen.globals.get('thingbot_map_to_pulse')).toContain('int mapToPulse(int value)')
    const setup = [...gen.setups.values()].join('\n')
    expect(setup).toContain('pwm.begin();')
    expect(setup).toContain('pwm.setOscillatorFrequency(27000000);')
    expect(setup).toContain('pwm.setPWMFreq(50);')
    expect(setup).toContain('pinMode(SW, INPUT);')
  })

  it.each([
    ['thingBotC3_startServoAngle', makeBlock({ ANGLE: '180', SECONDS: '2' }, { SERVO: '1' }), '#define SERVO_1 12'],
    ['thingBotC3_buzzer', makeBlock({ SOUND: '440' }), '#define BUZZER 14'],
    ['thingBotC3_playNote', makeBlock({ BEATS: '1' }, { NOTE: 'C', OCTAVE: '4' }), '#define BUZZER 14'],
    ['thingBotC3_setTempo', makeBlock({ TEMPO: '100' }), '#define BUZZER 14'],
    ['thingBotC3_rest', makeBlock({ BEATS: '1' }), '#define BUZZER 14'],
    ['thingBotC3_setMotor', makeBlock({ SPEED: '60' }, { MOTOR: '1', DIRECTION: 'forward' }), '#define M1_A 2'],
  ])('registers the PWM declarations and setup from %s alone, with no init block present', (opcode, block, pin) => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock[opcode](block)

    expect(gen.includes.get('thingbot_pwm')).toContain('#include <Adafruit_PWMServoDriver.h>')
    expect(gen.globals.get('thingbot_pins')).toContain(pin)
    expect(gen.globals.get('thingbot_pwm')).toContain('Adafruit_PWMServoDriver pwm')
    expect([...gen.setups.values()].join('\n')).toContain('pwm.begin();')
  })

  it('collapses the PWM registration to one entry per bucket no matter how many hardware blocks are used', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.thingBotC3_setMotor(makeBlock())
    gen.forBlock.thingBotC3_setServoAngle(makeBlock())
    gen.forBlock.thingBotC3_buzzer(makeBlock())
    gen.forBlock.thingBotC3_setLed(makeBlock({}, { LED: 'LED_1' }))
    gen.forBlock.thingBotC3_switch(makeBlock())
    gen.forBlock.thingBotC3_playNote(makeBlock({ BEATS: '1' }, { NOTE: 'C', OCTAVE: '4' }))
    gen.forBlock.thingBotC3_init(makeBlock())

    // One include line, one PWM setup sequence; globals holds the pin map, the pwm object,
    // mapToPulse, the servo-angle helper bucket brought in by thingBotC3_setServoAngle, and the
    // music helper bucket brought in by thingBotC3_playNote.
    expect(gen.includes.size).toBe(1)
    expect(gen.globals.size).toBe(5)
    expect(gen.setups.size).toBe(1)
    // The setup sequence itself is not duplicated even though thingBotC3_init ran after five
    // other hardware blocks already registered it.
    const setup = [...gen.setups.values()].join('\n')
    expect(setup.match(/pwm\.begin\(\);/g)).toHaveLength(1)
  })

  it('emits motor, servo, buzzer, and LED commands with safe empty-input defaults', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.thingBotC3_setMotor(makeBlock())).toBe(
      'pwm.setPWM(M1_A, 0, 0);\npwm.setPWM(M1_B, 0, mapToPulse(0));\n',
    )
    expect(gen.forBlock.thingBotC3_setMotor(makeBlock({ SPEED: '60' }, { MOTOR: '2', DIRECTION: 'backward' }))).toBe(
      'pwm.setPWM(M2_A, 0, mapToPulse(60));\npwm.setPWM(M2_B, 0, 0);\n',
    )
    expect(gen.forBlock.thingBotC3_setServo(makeBlock({ PULSE: '1500' }, { SERVO: '3' }))).toBe(
      'pwm.setPWM(SERVO_3, 0, 1500);\n',
    )
    expect(gen.forBlock.thingBotC3_buzzer(makeBlock())).toBe('pwm.setPin(BUZZER, 0);\n')
    expect(gen.forBlock.thingBotC3_setLed(makeBlock({ BRIGHTNESS: '50' }, { LED: 'LED_2' }))).toBe(
      'pwm.setPin(LED_2, mapToPulse(50));\n',
    )
  })

  it('emits the music helpers and a note at its concert-pitch frequency', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.thingBotC3_playNote(makeBlock({ BEATS: '1' }, { NOTE: 'A', OCTAVE: '4' }))

    expect(code).toBe('musicPlay(440, 1);\n')
    const helpers = gen.globals.get('thingbot_music')
    expect(helpers).toContain('void musicPlay(int hz, float beats)')
    expect(helpers).toContain('int musicBPM')
  })

  it('resolves every note name and octave to an equal-tempered frequency', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)
    const hz = (note: string, octave: string) =>
      gen.forBlock.thingBotC3_playNote(makeBlock({ BEATS: '1' }, { NOTE: note, OCTAVE: octave }))

    expect(hz('C', '4')).toBe('musicPlay(262, 1);\n')
    expect(hz('G', '4')).toBe('musicPlay(392, 1);\n')
    expect(hz('C', '5')).toBe('musicPlay(523, 1);\n')
    expect(hz('A', '3')).toBe('musicPlay(220, 1);\n')
    expect(hz('A#', '4')).toBe('musicPlay(466, 1);\n')
  })

  it('defaults an empty note block to C4 for one beat', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.thingBotC3_playNote(makeBlock())).toBe('musicPlay(262, 1);\n')
  })

  it('emits a rest as a silent note of the same duration', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.thingBotC3_rest(makeBlock({ BEATS: '0.5' }))).toBe('musicPlay(0, 0.5);\n')
    expect(gen.globals.get('thingbot_music')).toContain('void musicPlay(int hz, float beats)')
  })

  it('emits the tempo assignment and defaults to 120 BPM', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.thingBotC3_setTempo(makeBlock({ TEMPO: '76' }))).toBe('musicBPM = 76;\n')
    expect(gen.forBlock.thingBotC3_setTempo(makeBlock())).toBe('musicBPM = 120;\n')
  })

  it('restores the servo frame rate after every note', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)
    gen.forBlock.thingBotC3_playNote(makeBlock())

    const helpers = gen.globals.get('thingbot_music') ?? ''

    // PCA9685 has one prescaler for all 16 channels, so a note's frequency is also the servo frame
    // rate. Leaving it there would strand every servo on a broken frame once the music stops.
    expect(helpers).toContain('pwm.setPWMFreq(50)')
  })

  it('emits the angle helpers and the degree-based servo command', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.thingBotC3_setServoAngle(makeBlock({ ANGLE: '90' }, { SERVO: '1' }))

    expect(code).toBe('servoSetAngle(SERVO_1, 90);\n')
    const helpers = gen.globals.get('thingbot_servo_angle')
    expect(helpers).toContain('void servoSetAngle(int ch, int deg)')
    expect(helpers).toContain('SERVO_PULSE_MIN')
  })

  it('defaults the degree-based servo command to S1 at 90 degrees', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.thingBotC3_setServoAngle(makeBlock())).toBe('servoSetAngle(SERVO_1, 90);\n')
  })

  it('emits a timed sweep that carries the duration in seconds', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.thingBotC3_moveServoAngle(makeBlock({ ANGLE: '180', SECONDS: '1.5' }, { SERVO: '2' }))

    expect(code).toBe('servoMoveTo(SERVO_2, 180, 1.5);\n')
    expect(gen.globals.get('thingbot_servo_angle')).toContain('void servoMoveTo(int ch, int deg, float seconds)')
  })

  it('defaults the timed sweep to one second', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.thingBotC3_moveServoAngle(makeBlock())).toBe('servoMoveTo(SERVO_1, 90, 1);\n')
  })

  it('emits a non-blocking start command that records the motion instead of sweeping', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.thingBotC3_startServoAngle(makeBlock({ ANGLE: '180', SECONDS: '1.5' }, { SERVO: '2' }))

    expect(code).toBe('servoStart(SERVO_2, 180, 1.5);\n')
    const helpers = gen.globals.get('thingbot_servo_angle') ?? ''
    expect(helpers).toContain('void servoStart(int ch, int deg, float seconds)')
    expect(helpers).toContain('bool servoTickAll()')
    expect(helpers).toContain('void servoWaitAll()')
    // servoMoveTo keeps its own step-based loop: going through the tick machinery would make the
    // single-servo block wait for every running motion, as servoWaitAll does.
    const moveTo = helpers.indexOf('void servoMoveTo(int ch, int deg, float seconds)')
    expect(moveTo).toBeGreaterThanOrEqual(0)
    expect(helpers.slice(moveTo, helpers.indexOf('\n}', moveTo))).not.toMatch(/servoTick|servoMotion|servoWaitAll/)
  })

  it('defaults the non-blocking start command to S1 at 90 degrees over one second', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.thingBotC3_startServoAngle(makeBlock())).toBe('servoStart(SERVO_1, 90, 1);\n')
  })

  it('guards the tick against a zero or negative duration instead of dividing by it', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)
    gen.forBlock.thingBotC3_startServoAngle(makeBlock())

    const helpers = gen.globals.get('thingbot_servo_angle') ?? ''

    expect(helpers).toMatch(/dur = seconds > 0/)
  })

  it('emits the wait-for-all command and registers the same helper bucket', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.thingBotC3_waitServos(makeBlock())

    expect(code).toBe('servoWaitAll();\n')
    expect(gen.globals.get('thingbot_servo_angle')).toContain('void servoWaitAll()')
  })

  it('emits the release command and its helper, so releasing alone still compiles', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.thingBotC3_releaseServo(makeBlock({}, { SERVO: '3' }))

    expect(code).toBe('servoRelease(SERVO_3);\n')
    expect(gen.globals.get('thingbot_servo_angle')).toContain('void servoRelease(int ch)')
  })

  it('remembers the last angle per channel so a sweep knows where it starts', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)
    gen.forBlock.thingBotC3_setServoAngle(makeBlock())

    const helpers = gen.globals.get('thingbot_servo_angle') ?? ''

    // Chỉ số là số kênh PCA9685 nên lời gọi truyền thẳng macro SERVO_n, không phụ thuộc
    // thứ tự hai mục globals trong tệp sinh ra.
    expect(helpers).toContain('int servoAngle[16]')
    expect(helpers).toContain('servoAngle[ch]')
  })

  it('reads the switch as active-low', () => {
    const gen = makeGenerator()
    registerThingbotGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.thingBotC3_switch(makeBlock())).toEqual(['!digitalRead(SW)', Order.ATOMIC])
  })
})

describe('manifests', () => {
  it('thingbot builds with USB CDC on boot, so Serial reaches the Monitor', () => {
    expect(thingbotManifest.compile?.options).toEqual({ CDCOnBoot: 'cdc' })
  })

  it('thingbot-core is hidden: the device activates it', () => {
    expect(thingbotCoreManifest.hidden).toBe(true)
  })

  it('thingbot declares the live-mode firmware image its pack ships', () => {
    const firmware = thingbotManifest.firmware ?? []
    expect(firmware).toHaveLength(1)
    expect(firmware[0].id).toBe('telemetrix-ble')
    expect(firmware[0].path).toBe('firmware/telemetrix-ble/telemetrix-ble.ino.bin')
    expect(firmware[0].name.id).toBe('device.thingbot.firmware.telemetrixBle')
    // The image must be traceable to the firmware commit it was built from; a pack rebuilt without
    // rebuilding the firmware would otherwise ship a stale binary invisibly.
    expect(firmware[0].source).toMatch(/^[0-9a-f]{7,40}$/)
  })
})
