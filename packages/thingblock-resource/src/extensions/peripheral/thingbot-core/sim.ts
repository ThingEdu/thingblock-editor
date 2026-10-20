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
