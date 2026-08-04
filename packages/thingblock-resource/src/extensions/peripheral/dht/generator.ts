/**
 * DHT sensor Arduino codegen. One `DHT` instance per `NO` index, declared by `dht_init`; the humidity
 * and temperature readers reference the same instance by that index.
 */
import type { Block } from '@scratch/scratch-blocks'
import type { RegisterGenerators } from '../../../shared/types'

export const registerGenerators: RegisterGenerators = (generator, Order) => {
  const fieldValue = (block: Block, name: string, fallback: string): string => {
    const value: unknown = block.getFieldValue(name)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
  }

  generator.forBlock.dht_init = (block) => {
    const no = generator.valueToCode(block, 'NO', Order.ATOMIC) || '1'
    const pin = fieldValue(block, 'PIN', '2')
    const model = fieldValue(block, 'MODEL', '11')

    generator.includes.set('dht', '#include <DHT.h>')
    generator.globals.set(`dht_${no}`, `DHT dht_${no}(${pin}, ${model});`)

    return ''
  }

  generator.forBlock.dht_readHumidity = (block) => {
    const no = generator.valueToCode(block, 'NO', Order.ATOMIC) || '1'
    return [`dht_${no}.readHumidity()`, Order.ATOMIC]
  }

  generator.forBlock.dht_readTemperature = (block) => {
    const no = generator.valueToCode(block, 'NO', Order.ATOMIC) || '1'
    const unit = fieldValue(block, 'UNIT', 'false')
    return [`dht_${no}.readTemperature(${unit})`, Order.ATOMIC]
  }
}
