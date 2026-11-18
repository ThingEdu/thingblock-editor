import { createRoot } from 'react-dom/client'
import { Button } from './components/button/button'

const app = document.querySelector('#app')
if (!app) throw new Error('main: #app element missing from index.html')

createRoot(app).render(<Button>ThingBlock Virtualspace</Button>)
