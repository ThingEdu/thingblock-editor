import { describe, expect, it } from 'vitest'
import { cpp } from '../src/cpp'
import { BoardTrap } from '../src/runtime'

describe('C++ integer semantics', () => {
  it('wraps int arithmetic at 32 bits, as the ESP32 does', () => {
    expect(cpp.i32(2147483647 + 1)).toBe(-2147483648)
    expect(cpp.imul(65536, 65536)).toBe(0)
  })

  it('truncates integer division toward zero', () => {
    expect(cpp.idiv(7, 2)).toBe(3)
    expect(cpp.idiv(-7, 2)).toBe(-3)
    expect(cpp.idiv(7, -2)).toBe(-3)
  })

  it('traps on integer division or remainder by zero instead of returning Infinity', () => {
    expect(() => cpp.idiv(1, 0)).toThrow(BoardTrap)
    expect(() => cpp.imod(1, 0)).toThrow(BoardTrap)
    expect(cpp.imod(-7, 3)).toBe(-1)
  })

  it('converts a double to int by truncation, saturating like the RISC-V fcvt.w.d instruction', () => {
    expect(cpp.toInt(2.9)).toBe(2)
    expect(cpp.toInt(-2.9)).toBe(-2)
    expect(cpp.toInt(1e12)).toBe(2147483647)
    expect(cpp.toInt(-1e12)).toBe(-2147483648)
    expect(cpp.toInt(Number.NaN)).toBe(2147483647)
  })

  it('converts to unsigned long modulo 2^32, which is what delay() receives', () => {
    expect(cpp.toUlong(-1)).toBe(4294967295)
    expect(cpp.toUlong(1500.7)).toBe(1500)
  })
})

describe('Print formatting (ESP32 core Print.cpp)', () => {
  it('prints a double with two decimals, rounding half up the way printFloat does', () => {
    expect(cpp.printFloat(3)).toBe('3.00')
    expect(cpp.printFloat(1.999)).toBe('2.00')
    expect(cpp.printFloat(-1.5)).toBe('-1.50')
    expect(cpp.printFloat(0.25)).toBe('0.25')
  })

  it('prints the out-of-range markers the core prints', () => {
    expect(cpp.printFloat(Number.NaN)).toBe('nan')
    expect(cpp.printFloat(Infinity)).toBe('inf')
    expect(cpp.printFloat(4294967041)).toBe('ovf')
  })

  it('prints a bool as 1 or 0, because print() has no bool overload and takes it as an int', () => {
    expect(cpp.printBool(true)).toBe('1')
    expect(cpp.printBool(false)).toBe('0')
  })
})
