/**
 * The C++ value semantics generated JavaScript calls into, so a program computes on the simulator what
 * it computes on the ESP32-C3: 32-bit `int` that wraps, integer division that truncates and traps on
 * zero, double-to-int conversion that truncates, and the ESP32 core's `Print` formatting. The generator
 * decides statically which of these an expression needs, from the same C++ types the Arduino generator
 * declares.
 */
import { BoardTrap } from './runtime'

const INT_MAX = 2147483647
const INT_MIN = -2147483648

/**
 * `Print::printFloat` from the ESP32 Arduino core (cores/esp32/Print.cpp), operation for operation, so
 * the rounding lands on the same digit: add half of the last digit, then peel digits off the remainder.
 * @param value The double to print.
 * @param digits Digits after the decimal point; `print(double)` defaults to 2.
 * @returns The text the board prints.
 */
const printFloat = (value: number, digits = 2): string => {
  if (Number.isNaN(value)) return 'nan'
  if (!Number.isFinite(value)) return 'inf'
  if (value > 4294967040.0 || value < -4294967040.0) return 'ovf'

  let out = ''
  let number = value
  if (number < 0.0) {
    out += '-'
    number = -number
  }

  let rounding = 0.5
  for (let i = 0; i < digits; ++i) rounding /= 10.0
  number += rounding

  const intPart = Math.trunc(number) >>> 0
  let remainder = number - intPart
  out += String(intPart)
  if (digits > 0) out += '.'
  for (let left = digits; left > 0; left--) {
    remainder *= 10.0
    const toPrint = Math.trunc(remainder)
    out += String(toPrint)
    remainder -= toPrint
  }
  return out
}

export const cpp = {
  /**
   * Wrap to a 32-bit signed `int`.
   * @param x The value to wrap.
   * @returns The wrapped value.
   */
  i32: (x: number): number => x | 0,

  /**
   * `int * int`, wrapping at 32 bits (a plain JS multiply loses the low bits past 2^53).
   * @param a The left operand.
   * @param b The right operand.
   * @returns The wrapped product.
   */
  imul: (a: number, b: number): number => Math.imul(a, b),

  /**
   * `int / int`: truncates toward zero; dividing by zero resets the board.
   * @param a The dividend.
   * @param b The divisor.
   * @returns The quotient.
   */
  idiv: (a: number, b: number): number => {
    if (b === 0) throw new BoardTrap('IntegerDivideByZero')
    return (a / b) | 0
  },

  /**
   * `int % int`: takes the dividend's sign; by zero resets the board.
   * @param a The dividend.
   * @param b The divisor.
   * @returns The remainder.
   */
  imod: (a: number, b: number): number => {
    if (b === 0) throw new BoardTrap('IntegerDivideByZero')
    return (a % b) | 0
  },

  /**
   * `(int)double`: truncation. Out-of-range values are undefined behaviour in C++; the RISC-V
   * `fcvt.w.d` the compiler emits saturates them, and NaN becomes INT_MAX.
   * @param x The value to convert.
   * @returns The converted `int`.
   */
  toInt: (x: number): number => {
    if (Number.isNaN(x)) return INT_MAX
    if (x >= INT_MAX) return INT_MAX
    if (x <= INT_MIN) return INT_MIN
    return Math.trunc(x)
  },

  /**
   * Conversion to `unsigned long` (32-bit on the ESP32), as `delay()` receives its argument.
   * @param x The value to convert.
   * @returns The converted `unsigned long`.
   */
  toUlong: (x: number): number => Math.trunc(x) >>> 0,

  printFloat,

  /**
   * `print(bool)` resolves to `print(int)`.
   * @param b The value to print.
   * @returns The printed text.
   */
  printBool: (b: boolean): string => (b ? '1' : '0'),

  /**
   * `print(int)` / `print(long)`.
   * @param n The value to print.
   * @returns The printed text.
   */
  printInt: (n: number): string => String(n | 0),
}

export type Cpp = typeof cpp
