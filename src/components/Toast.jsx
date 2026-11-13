import { useEffect } from 'react'
import { useClock } from '../clock/ClockContext.jsx'
import { SNAPPY_MS, SPRING_GENTLE } from '../motion/springs.js'
import { useHeld, usePresence } from '../motion/usePresence.js'
import styles from './Toast.module.css'

export const TOAST_MS = 2000

// Exit for usePresence: the pill sinks a little and fades.
const fadeToastOut = (el) => [
  el.animate(
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: 'translateY(10px) scale(0.96)' },
    ],
    { duration: SNAPPY_MS, easing: SPRING_GENTLE, fill: 'forwards' },
  ),
]

// Transient refusal message; dismisses itself on the shared clock, slides in and fades out.
export function Toast({ toast, dispatch }) {
  const clock = useClock()
  const id = toast === null ? null : toast.id
  const open = toast !== null
  const held = useHeld(open, { id, text: open ? toast.text : '' })
  const { mounted, closing, ref } = usePresence(open, fadeToastOut)

  useEffect(() => {
    if (id === null) return undefined
    const timer = clock.setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id }), TOAST_MS)
    return () => clock.clearTimeout(timer)
  }, [id, clock, dispatch])

  if (!mounted) return null
  return (
    // Keyed by toast id: a new toast is a new element, so its entrance animation replays.
    <div
      key={held.id}
      ref={ref}
      className={styles.toast}
      data-control="toast"
      data-closing={closing ? 'true' : undefined}
      role="status"
    >
      {held.text}
    </div>
  )
}
