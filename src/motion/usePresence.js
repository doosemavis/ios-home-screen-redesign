import { useLayoutEffect, useRef, useState } from 'react'
import { allFinished, canAnimate } from './motionEnv.js'

// Mount/unmount with an exit animation and no timers. When `open` turns false the
// element stays mounted (closing) while `runExit(element)` plays its WAAPI animations;
// it unmounts once they all settle (`finished` resolves or rejects). Recorder contract
// (Ruling T9-b): a paused animation seeked to its end stays paused and `finished` does
// NOT resolve on its own; the stepped recorder calls `animation.finish()` once a finite
// animation's stepped time reaches its end, then flushes. Nothing here reads real time.
// Without WAAPI (jsdom) or with reduced motion, the element unmounts at once.
// `runExit` must be stable (module-level).
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
