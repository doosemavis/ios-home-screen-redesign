import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import HomeScreenApp from './HomeScreenApp.jsx'
import RecordApp from './record/RecordApp.jsx'
import './motion/springs.css'

// `?record` plays the scripted video on a virtual clock; otherwise the app is for hand use.
const App = new URLSearchParams(window.location.search).has('record') ? RecordApp : HomeScreenApp

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
