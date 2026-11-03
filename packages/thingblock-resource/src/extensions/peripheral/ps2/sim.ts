/**
 * PS2 gamepad simulator codegen: the same `ps2x` calls as `generator.ts`, on the simulator's virtual
 * controller, whose buttons and sticks are the panel's gamepad. The library's button and stick
 * constants become their names, which the virtual controller looks up.
 */
import type { Block } from '@thingblock/thingblock-blocks'
import type { RegisterSimGenerators } from '../../../shared/types'

export const registerSimGenerators: RegisterSimGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }
  const pin = (block: Block, name: string, fallback: number): number => {
    const value = Number(block.getFieldValue(name))
    return Number.isInteger(value) && value >= 0 ? value : fallback
  }
  const ensurePs2 = (): void => {
    generator.globals.set('ps2x_instance', 'const ps2x = $.hw.PS2X();')
  }

  generator.forBlock.ps2_init = (block) => {
    ensurePs2()
    const [din, dout, cs, clk] = [
      pin(block, 'DIN', 7),
      pin(block, 'DOUT', 2),
      pin(block, 'CS', 10),
      pin(block, 'CLK', 6),
    ]
    return `ps2x.config_gamepad(${clk}, ${dout}, ${cs}, ${din}, false, false);`
  }

  generator.forBlock.ps2_readData = () => {
    ensurePs2()
    return 'ps2x.read_gamepad();'
  }

  generator.forBlock.ps2_getButton = (block) => {
    ensurePs2()
    return [`ps2x.Button(${JSON.stringify(fieldValue(block, 'BUTTON', 'PSB_PAD_UP'))})`, Order.ATOMIC]
  }
  generator.typeFor.ps2_getButton = () => 'bool'

  generator.forBlock.ps2_GetJoystick = (block) => {
    ensurePs2()
    return [`ps2x.Analog(${JSON.stringify(fieldValue(block, 'JOYSTICK', 'PSS_LX'))})`, Order.ATOMIC]
  }
  // `Analog()` returns a `byte`, which promotes to `int`.
  generator.typeFor.ps2_GetJoystick = () => 'int'
}
