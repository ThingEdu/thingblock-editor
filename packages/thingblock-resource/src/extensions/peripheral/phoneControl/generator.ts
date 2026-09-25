/**
 * Phone-control Arduino codegen.
 *
 * The service starts from `generator.setups`, not from the block's own position in the stack, so
 * the phone can connect while the program is still in its opening `wait` blocks — and so placing
 * the block twice cannot start it twice. `ArduinoGenerator.assemble` runs the setups bucket ahead
 * of the hat's body, which is what makes that ordering hold.
 */

import type { RegisterGenerators } from '../../../shared/types'

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  generator.forBlock.phoneControl_start = (block) => {
    const name = generator.valueToCode(block, 'NAME', Order.NONE) || '"ThingBot"'

    generator.includes.set('phone_control', '#include <ThingBotTelemetrixService.h>')
    generator.setups.set('phone_control', `thingbotPhoneControlBegin(${name});`)

    return ''
  }
}
