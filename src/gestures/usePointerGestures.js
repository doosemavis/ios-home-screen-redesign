import { useEffect, useRef } from 'react'
import { useClock } from '../clock/ClockContext.jsx'

export const DEFAULT_GESTURE_OPTIONS = {
  longPressMs: 500,
  moveThresholdPx: 8,
  swipeThresholdPx: 40,
}

const IDLE = null

function capture(event) {
  const el = event.currentTarget
  if (typeof el.setPointerCapture === 'function') {
    try {
      el.setPointerCapture(event.pointerId)
    } catch {
      // Capture is an enhancement; some synthetic pointers cannot be captured.
    }
  }
}

// Discriminates tap / long-press / drag-start / swipe from raw pointer events.
// Callbacks receive { target, dx, dy } where target is the element pressed.
export function usePointerGestures(handlers, options = {}) {
  const { longPressMs, moveThresholdPx, swipeThresholdPx } = {
    ...DEFAULT_GESTURE_OPTIONS,
    ...options,
  }
  const clock = useClock()
  const latest = useRef(handlers)
  const gesture = useRef(IDLE)

  useEffect(() => {
    latest.current = handlers
  })

  const clearTimer = () => {
    if (gesture.current !== IDLE && gesture.current.timer !== null) {
      clock.clearTimeout(gesture.current.timer)
      gesture.current.timer = null
    }
  }

  useEffect(
    () => () => {
      if (gesture.current !== IDLE && gesture.current.timer !== null) {
        clock.clearTimeout(gesture.current.timer)
      }
    },
    [clock],
  )

  const onPointerDown = (event) => {
    if (event.button > 0) return
    capture(event)
    const start = { x: event.clientX, y: event.clientY, target: event.target }
    const next = { ...start, mode: 'pending', timer: null }
    gesture.current = next
    if (latest.current.onLongPress) {
      next.timer = clock.setTimeout(() => {
        next.timer = null
        if (next.mode !== 'pending') return
        next.mode = 'longpress'
        latest.current.onLongPress?.({ target: next.target, dx: 0, dy: 0 })
      }, longPressMs)
    }
  }

  const onPointerMove = (event) => {
    const g = gesture.current
    if (g === IDLE || g.mode !== 'pending') return
    const dx = event.clientX - g.x
    const dy = event.clientY - g.y
    if (Math.hypot(dx, dy) <= moveThresholdPx) return
    clearTimer()
    const consumed = latest.current.onDragStart?.({ target: g.target, dx, dy }) === true
    g.mode = consumed ? 'drag' : 'swipe'
  }

  const onPointerUp = (event) => {
    const g = gesture.current
    if (g === IDLE) return
    clearTimer()
    gesture.current = IDLE
    const info = { target: g.target, dx: event.clientX - g.x, dy: event.clientY - g.y }
    if (g.mode === 'pending') latest.current.onTap?.(info)
    if (g.mode === 'swipe' && Math.abs(info.dx) >= swipeThresholdPx && Math.abs(info.dx) > Math.abs(info.dy)) {
      latest.current.onSwipe?.(info)
    }
  }

  const onPointerCancel = () => {
    clearTimer()
    gesture.current = IDLE
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
