import { useLayoutEffect, useRef, useState } from 'react'
import { allFinished, canAnimate } from './motionEnv.js'

// Mount/unmount with an exit animation and no timers. When `open` turns false the
// element stays mounted (closing) while `runExit(element)` plays its WAAPI animations;
// it unmounts once they all finish. A recorder that seeks the animations to their end
// resolves `finished`, so exits stay deterministic frame by frame. Without WAAPI
// (jsdom) or with reduced motion, the element unmounts at once. `runExit` must be stable.
export function usePresence(open, runExit) {
  const ref = useRef(null)
  const [closing, setClosing] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    setClosing(!open && canAnimate())
  }

  useLayoutEffect(() => {
    if (!closing) return undefined
    const animations = ref.current === null ? [] : runExit(ref.current)
    let live = true
    allFinished(animations).then(() => {
      if (live) setClosing(false)
    })
    return () => {
      live = false
      animations.forEach((animation) => animation.cancel())
    }
  }, [closing, runExit])

  return { mounted: open || closing, closing, ref }
}

const sameValues = (a, b) => Object.keys(b).every((key) => Object.is(a[key], b[key]))

// The last values seen while `open`, so a closing overlay keeps showing what it showed
// (state has already moved on, e.g. the sheet's view is null). Shallow-compared object.
export function useHeld(open, values) {
  const [held, setHeld] = useState(values)
  if (open && !sameValues(held, values)) setHeld(values)
  return open ? values : held
}
