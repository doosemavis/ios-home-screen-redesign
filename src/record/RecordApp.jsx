import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { createVirtualClock } from '../clock/clock.js'
import { ClockProvider } from '../clock/ClockContext.jsx'
import { DeviceFrame } from '../components/DeviceFrame.jsx'
import { HomeScreen } from '../components/HomeScreen.jsx'
import { TouchIndicator } from '../components/TouchIndicator.jsx'
import { createInitialLayout } from '../model/initialLayout.js'
import { homeScreenReducer, initialState } from '../state/homeScreenReducer.js'
import { Stage } from '../stage/Stage.jsx'
import { createAnimationStepper } from './animationStepper.js'
import { createRecorder } from './recorder.js'
import { createRunner } from './runner.js'
import { SCENES } from './timeline.js'
import styles from './RecordApp.module.css'

const createState = () => initialState(createInitialLayout())

// Real macrotasks (never the virtual clock): React commits discrete updates in a
// microtask and default-priority work and passive effects in scheduler macrotasks.
const realMacrotask = () => new Promise((resolve) => setTimeout(resolve, 0))
async function flush() {
  await realMacrotask()
  await realMacrotask()
}

async function whenReady() {
  await document.fonts.ready
  await flush()
}

// Builds the runner + recorder for this mount and publishes window.__recorder.
// Errors thrown anywhere in the page (e.g. inside a React handler) fail the recording.
function useRecorder({ clock, rootRef, setCaption, setEndCard }) {
  useEffect(() => {
    const runner = createRunner({
      clock,
      scenes: SCENES,
      root: rootRef.current,
      onCaption: setCaption,
      onEndCard: () => setEndCard(true),
    })
    const stepper = createAnimationStepper({ getAnimations: () => document.getAnimations(), flush })
    const recorder = createRecorder({ clock, stepper, flush, totalMs: runner.totalMs, whenReady })
    const onError = (event) => recorder.report(event.error ?? event.message)
    const onRejection = (event) => recorder.report(event.reason)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    window.__recorder = recorder
    return () => {
      runner.dispose()
      recorder.dispose()
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      if (window.__recorder === recorder) delete window.__recorder
    }
  }, [clock, rootRef, setCaption, setEndCard])
}

// The page itself matches the stage and never scrolls, so a 540×675 clip at (0, 0) is
// exactly the frame.
function useRecordPage() {
  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add(styles.page)
    return () => html.classList.remove(styles.page)
  }, [])
}

// `?record`: the same home screen, driven by the scripted timeline on a virtual clock,
// with touch circles, captions and the end card. The renderer steps it frame by frame
// through window.__recorder.
export default function RecordApp() {
  const [state, dispatch] = useReducer(homeScreenReducer, undefined, createState)
  const [clock] = useState(createVirtualClock)
  const [caption, setCaption] = useState(null)
  const [showEndCard, setEndCard] = useState(false)
  const rootRef = useRef(null)
  useRecordPage()
  useRecorder({ clock, rootRef, setCaption, setEndCard })
  return (
    <ClockProvider clock={clock}>
      <div ref={rootRef} className={styles.root} data-recorder>
        <Stage mode="record" caption={caption} showEndCard={showEndCard}>
          <DeviceFrame>
            <HomeScreen state={state} dispatch={dispatch} />
            <TouchIndicator />
          </DeviceFrame>
        </Stage>
      </div>
    </ClockProvider>
  )
}
