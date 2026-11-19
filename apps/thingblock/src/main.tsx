import { createRoot } from 'react-dom/client'
import App from './app/app'
import './css/index.css'

const app = document.querySelector('#app')
if (!app) throw new Error('main: #app element missing from index.html')

createRoot(app).render(<App />)
