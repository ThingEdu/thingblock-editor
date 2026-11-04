import { describe, expect, it } from 'vitest'
import { createBoard } from '../src/board'

describe('Ultrasonic (HC-SR04 library)', () => {
  it('reads the distance the rig sets, through the library divisors (CM 28, INC 71)', () => {
    const board = createBoard()
    const sonar = board.$.hw.Ultrasonic(0, 4)
    board.setInput('ultrasonic', 30)
    expect(sonar.read(28)).toBe(30)
    expect(sonar.read(71)).toBe(11)
  })

  it('sees nothing in front by default, and an empty echo times out at the library 20 ms', () => {
    const board = createBoard()
    const sonar = board.$.hw.Ultrasonic(0, 4)
    expect(sonar.read(28)).toBe(100)
    board.setInput('ultrasonic', 1000)
    expect(sonar.read(28)).toBe(357)
  })

  it('takes the trigger pulse plus the echo time', () => {
    const board = createBoard()
    board.setInput('ultrasonic', 50)
    board.$.hw.Ultrasonic(0, 4).read(28)
    expect(board.clock.now).toBe(12 + 50 * 56)
  })

  it('tells the panel the program has a distance sensor', () => {
    const board = createBoard()
    expect(board.devices.ultrasonic).toBeUndefined()
    board.$.hw.Ultrasonic(0, 4)
    expect(board.devices.ultrasonic).toBe(true)
  })
})

describe('PS2X gamepad', () => {
  it('finds the controller and reports no button pressed, sticks centred', () => {
    const { $ } = createBoard()
    const ps2x = $.hw.PS2X()
    expect(ps2x.config_gamepad(6, 2, 10, 7, false, false)).toBe(0)
    ps2x.read_gamepad()
    expect(ps2x.Button('PSB_PAD_UP')).toBe(false)
    expect(ps2x.Analog('PSS_LX')).toBe(128)
  })

  it('reports what the rig holds as of the last read_gamepad, like the library', () => {
    const board = createBoard()
    const ps2x = board.$.hw.PS2X()
    board.setInput('ps2:PSB_PAD_UP', 1)
    expect(ps2x.Button('PSB_PAD_UP')).toBe(false)
    ps2x.read_gamepad()
    expect(ps2x.Button('PSB_PAD_UP')).toBe(true)
    board.setInput('ps2:PSB_PAD_UP', 0)
    expect(ps2x.Button('PSB_PAD_UP')).toBe(true)
    ps2x.read_gamepad()
    expect(ps2x.Button('PSB_PAD_UP')).toBe(false)
  })

  it('tells the panel the program has a gamepad', () => {
    const board = createBoard()
    board.$.hw.PS2X()
    expect(board.devices.ps2).toBe(true)
  })
})
