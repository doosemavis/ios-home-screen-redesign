import { useCallback, useRef } from 'react'

// Remembers the pointer type of the latest press under the element it is attached to
// (capture phase, so no child can hide it). `wasTouch()` tells a contextmenu that came
// from a touch long-press apart from a mouse right-click.
export function useLastPointerType() {
  const last = useRef(null)
  const onPointerDownCapture = useCallback((event) => {
    last.current = event.pointerType ?? null
  }, [])
  const wasTouch = useCallback(() => last.current === 'touch', [])
  return { onPointerDownCapture, wasTouch }
}
