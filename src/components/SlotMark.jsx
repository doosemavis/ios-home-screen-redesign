import { useEffect, useState } from 'react'
import { useClock } from '../clock/ClockContext.jsx'
import { SNAPPY_MS } from '../motion/springs.js'
import styles from './SlotMark.module.css'

// The accept fade rides the icon's settle spring; matches .landing in SlotMark.module.css.
const ACCEPT_FADE_MS = SNAPPY_MS

const STATE_CLASS = {
  idle: styles.idle,
  ready: `${styles.ready} ${styles.pulse}`,
  hover: styles.hover,
  landing: styles.landing,
}

// True from the render where the glow's slot takes the drop (hover → no mark) until
// its fade has played on the shared clock, so the glow is accepted in place instead
// of blinking off.
function useAccepting(state) {
  const clock = useClock()
  const [prev, setPrev] = useState(state)
  const [accepting, setAccepting] = useState(false)
  if (state !== prev) {
    setPrev(state)
    setAccepting(prev === 'hover' && state === null)
  }
  useEffect(() => {
    if (!accepting) return undefined
    const id = clock.setTimeout(() => setAccepting(false), ACCEPT_FADE_MS)
    return () => clock.clearTimeout(id)
  }, [accepting, clock])
  return accepting
}

// One icon-sized squircle per slot, laid exactly over where an icon tile sits: the
// "you can place here" placeholder and the drop glow are the same element, so their
// sizes always match. It lives inside the slot (so a tap on it is a tap on the slot)
// and carries no data-item.
export function SlotMark({ state }) {
  const accepting = useAccepting(state)
  const shown = state ?? (accepting ? 'landing' : null)
  if (shown === null) return null
  return (
    <span
      className={`${styles.mark} ${STATE_CLASS[shown]}`}
      data-slot-mark={shown}
      data-drop-target={shown === 'hover' ? 'true' : undefined}
      aria-hidden="true"
    />
  )
}
