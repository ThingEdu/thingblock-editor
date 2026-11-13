import { Button } from '@thingblock/thingblock-ui'
import { createRoot } from 'react-dom/client'

const app = document.querySelector('#app')
if (!app) throw new Error('main: #app element missing from index.html')

createRoot(app).render(<Button>ThingBlock Virtualspace</Button>)
