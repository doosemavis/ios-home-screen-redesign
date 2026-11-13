import { useEffect } from 'react'
import { useClock } from '../clock/ClockContext.jsx'
import styles from './Toast.module.css'

export const TOAST_MS = 2000

// Transient refusal message; dismisses itself on the shared clock.
export function Toast({ toast, dispatch }) {
  const clock = useClock()
  const id = toast === null ? null : toast.id

  useEffect(() => {
    if (id === null) return undefined
    const timer = clock.setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id }), TOAST_MS)
    return () => clock.clearTimeout(timer)
  }, [id, clock, dispatch])

  if (toast === null) return null
  return (
    <div className={styles.toast} data-control="toast" role="status">
      {toast.text}
    </div>
  )
}
