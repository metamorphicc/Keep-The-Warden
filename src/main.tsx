import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/ui.css'
import './styles/screens.css'

const host = document.getElementById('root')
if (!host) throw new Error('Missing #root')

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
