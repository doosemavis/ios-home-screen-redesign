import { useReducer, useState } from 'react'
import { createRealClock } from './clock/clock.js'
import { ClockProvider } from './clock/ClockContext.jsx'
import { DeviceFrame } from './components/DeviceFrame.jsx'
import { HomeScreen } from './components/HomeScreen.jsx'
import { createInitialLayout } from './model/initialLayout.js'
import { homeScreenReducer, initialState } from './state/homeScreenReducer.js'
import { Stage } from './stage/Stage.jsx'

const createState = () => initialState(createInitialLayout())

const stageMode = () =>
  new URLSearchParams(window.location.search).has('record') ? 'record' : 'hand'

// App root: owns the home-screen state and provides the clock.
export default function HomeScreenApp({ clock: providedClock }) {
  const [state, dispatch] = useReducer(homeScreenReducer, undefined, createState)
  const [defaultClock] = useState(createRealClock)
  const clock = providedClock ?? defaultClock
  const [mode] = useState(stageMode)
  return (
    <ClockProvider clock={clock}>
      <Stage mode={mode}>
        <DeviceFrame>
          <HomeScreen state={state} dispatch={dispatch} />
        </DeviceFrame>
      </Stage>
    </ClockProvider>
  )
}
