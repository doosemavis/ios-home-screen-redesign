import { useEffect, useRef } from 'react'

// Dialog focus contract: focus moves in on mount, Escape closes, and focus returns
// to the trigger (only if it still exists) on unmount or as soon as `active` turns
// false, i.e. when the dialog starts its exit animation.
export function useModalFocus({ rootRef, initialSelector, restoreSelector, onClose, active = true }) {
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  // Also re-runs when a dialog reopened mid-exit becomes active again.
  useEffect(() => {
    if (!active) return
    rootRef.current?.querySelector(initialSelector)?.focus({ preventScroll: true })
  }, [rootRef, initialSelector, active])

  useEffect(() => {
    if (!active) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.querySelector(restoreSelector)?.focus({ preventScroll: true })
    }
  }, [restoreSelector, active])
}
