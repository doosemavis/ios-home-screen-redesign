import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import HomeScreenApp from './HomeScreenApp.jsx'
import './motion/springs.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HomeScreenApp />
  </StrictMode>,
)
