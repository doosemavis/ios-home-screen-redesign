import { createContext, useContext } from 'react'
import { createRealClock } from './clock.js'

const fallbackClock = createRealClock()
const ClockContext = createContext(fallbackClock)

export function ClockProvider({ clock, children }) {
  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClock() {
  return useContext(ClockContext)
}
