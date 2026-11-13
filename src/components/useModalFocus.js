import { useEffect, useRef } from 'react'

// Dialog focus contract: focus moves in on mount, Escape closes, and focus returns
// to the trigger on unmount (only if the trigger still exists).
export function useModalFocus({ rootRef, initialSelector, restoreSelector, onClose }) {
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    rootRef.current?.querySelector(initialSelector)?.focus()
  }, [rootRef, initialSelector])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.querySelector(restoreSelector)?.focus()
    }
  }, [restoreSelector])
}
