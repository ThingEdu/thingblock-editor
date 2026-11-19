import { createRoot } from 'react-dom/client'
import ReactModal from 'react-modal'
import App from './app/app'
import './css/index.css'

const app = document.querySelector<HTMLElement>('#app')
if (!app) throw new Error('main: #app element missing from index.html')

// An open modal hides the editor from screen readers
ReactModal.setAppElement(app)
createRoot(app).render(<App />)
