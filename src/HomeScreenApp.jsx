import { useReducer, useState } from 'react'
import { createRealClock } from './clock/clock.js'
import { ClockProvider } from './clock/ClockContext.jsx'
import { DeviceFrame } from './components/DeviceFrame.jsx'
import { HomeScreen } from './components/HomeScreen.jsx'
import { createInitialLayout } from './model/initialLayout.js'
import { homeScreenReducer, initialState } from './state/homeScreenReducer.js'
import { Stage } from './stage/Stage.jsx'

const createState = () => initialState(createInitialLayout())

// Hand-use app root: owns the home-screen state and provides the clock. `?record` is
// routed to RecordApp by main.jsx, so this is always the hand stage.
export default function HomeScreenApp({ clock: providedClock }) {
  const [state, dispatch] = useReducer(homeScreenReducer, undefined, createState)
  const [defaultClock] = useState(createRealClock)
  const clock = providedClock ?? defaultClock
  return (
    <ClockProvider clock={clock}>
      <Stage mode="hand">
        <DeviceFrame>
          <HomeScreen state={state} dispatch={dispatch} />
        </DeviceFrame>
      </Stage>
    </ClockProvider>
  )
}
