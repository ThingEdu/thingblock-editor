/** Toolbox category for the DHT temperature/humidity sensor peripheral. */
import type { ToolboxCategory } from '../../../shared/types'

const noShadow = { NO: { type: 'math_number', fields: { NUM: 1 } } }

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'DHT',
  colour: '#42CCFF',
  contents: [
    { kind: 'block', type: 'dht_init', inputs: noShadow },
    { kind: 'block', type: 'dht_readHumidity', inputs: noShadow },
    { kind: 'block', type: 'dht_readTemperature', inputs: noShadow },
  ],
}

export default toolbox
