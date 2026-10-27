/**
 * Rotary encoder Arduino codegen. Both phases interrupt on every edge and a transition table turns the
 * old/new A-B state into -1/0/+1 quarter steps, so fast turns are not lost while the sketch is busy in
 * `delay()`. Quarter steps are folded into whole detents (four per click) inside the handler, which
 * keeps the count symmetric around zero instead of losing a click to integer division.
 *
 * Interrupts on both pins work on any pin of ESP32-class boards; on an Uno only pins 2 and 3 can
 * interrupt, which is why those are the encoder's natural pins there.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import type { RegisterGenerators } from '../../../shared/types'

// ESP32/ESP8266 cores define IRAM_ATTR (the handler must live in IRAM); elsewhere it expands to
// nothing. It goes in the includes bucket because the .ino preprocessor puts the handler's
// prototype ahead of the first function body, which can come before the globals bucket.
const ENCODER_INCLUDES = `#ifndef IRAM_ATTR
#define IRAM_ATTR
#endif`

const ENCODER_GLOBALS = `uint8_t encoder_pinA, encoder_pinB, encoder_pinBtn;
volatile uint8_t encoder_state = 0;
volatile int8_t encoder_steps = 0;
volatile long encoder_count = 0;

void IRAM_ATTR encoder_isr() {
  static const int8_t table[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};
  uint8_t ab = (digitalRead(encoder_pinA) << 1) | digitalRead(encoder_pinB);
  encoder_steps += table[(encoder_state << 2) | ab];
  encoder_state = ab;
  if (encoder_steps >= 4) {
    encoder_count++;
    encoder_steps = 0;
  } else if (encoder_steps <= -4) {
    encoder_count--;
    encoder_steps = 0;
  }
}

long encoder_position() {
  noInterrupts();
  long count = encoder_count;
  interrupts();
  return count;
}

void encoder_reset() {
  noInterrupts();
  encoder_count = 0;
  encoder_steps = 0;
  interrupts();
}`

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }

  const useEncoder = () => {
    generator.includes.set('encoder', ENCODER_INCLUDES)
    generator.globals.set('encoder', ENCODER_GLOBALS)
  }

  generator.forBlock.encoder_init = (block) => {
    const a = fieldValue(block, 'PIN_A', '2')
    const b = fieldValue(block, 'PIN_B', '10')
    const btn = fieldValue(block, 'PIN_BTN', '7')
    useEncoder()

    return (
      `encoder_pinA = ${a};\nencoder_pinB = ${b};\nencoder_pinBtn = ${btn};\n` +
      `pinMode(${a}, INPUT_PULLUP);\npinMode(${b}, INPUT_PULLUP);\npinMode(${btn}, INPUT_PULLUP);\n` +
      `encoder_state = (digitalRead(${a}) << 1) | digitalRead(${b});\n` +
      `attachInterrupt(digitalPinToInterrupt(${a}), encoder_isr, CHANGE);\n` +
      `attachInterrupt(digitalPinToInterrupt(${b}), encoder_isr, CHANGE);\n`
    )
  }

  generator.forBlock.encoder_readPosition = () => {
    useEncoder()
    return ['encoder_position()', Order.ATOMIC]
  }

  generator.forBlock.encoder_resetPosition = () => {
    useEncoder()
    return 'encoder_reset();\n'
  }

  // The button pulls the pin to ground against the internal pull-up, so pressed reads LOW.
  generator.forBlock.encoder_isPressed = () => {
    useEncoder()
    return ['(digitalRead(encoder_pinBtn) == LOW)', Order.ATOMIC]
  }
}
