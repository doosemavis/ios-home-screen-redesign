import { useEffect, useRef } from 'react'
import { useClock } from '../clock/ClockContext.jsx'

export const DEFAULT_GESTURE_OPTIONS = {
  longPressMs: 500,
  moveThresholdPx: 8,
  swipeThresholdPx: 40,
  getScale: () => 1,
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

const pointOf = (event) => ({ x: event.clientX, y: event.clientY })

// Discriminates tap / long-press / drag / swipe from raw pointer events.
// Distances are divided by getScale() so thresholds are in phone px, not screen px.
// Callbacks: onTap, onLongPress, onSwipe receive { target, dx, dy };
// canDrag({ target }) decides whether a move becomes a drag instead of a swipe, and
// a drag reports onDragStart({ target, point }), onDragMove({ point }),
// onDragEnd({ point }) and onDragCancel(). Only the pointer that pressed is followed.
export function usePointerGestures(handlers, options = {}) {
  const { longPressMs, moveThresholdPx, swipeThresholdPx, getScale } = {
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

  const isOther = (event) => gesture.current !== IDLE && gesture.current.pointerId !== event.pointerId

  const onPointerDown = (event) => {
    if (event.button > 0 || isOther(event)) return
    clearTimer()
    capture(event)
    const start = { x: event.clientX, y: event.clientY, target: event.target, pointerId: event.pointerId }
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
    if (g === IDLE || isOther(event)) return
    if (g.mode === 'drag') {
      latest.current.onDragMove?.({ point: pointOf(event) })
      return
    }
    if (g.mode !== 'pending') return
    const dx = (event.clientX - g.x) / getScale()
    const dy = (event.clientY - g.y) / getScale()
    if (Math.hypot(dx, dy) <= moveThresholdPx) return
    clearTimer()
    if (latest.current.canDrag?.({ target: g.target }) === true) {
      g.mode = 'drag'
      latest.current.onDragStart?.({ target: g.target, point: { x: g.x, y: g.y } })
      latest.current.onDragMove?.({ point: pointOf(event) })
    } else {
      g.mode = 'swipe'
    }
  }

  const onPointerUp = (event) => {
    const g = gesture.current
    if (g === IDLE || isOther(event)) return
    clearTimer()
    gesture.current = IDLE
    const info = {
      target: g.target,
      dx: (event.clientX - g.x) / getScale(),
      dy: (event.clientY - g.y) / getScale(),
    }
    if (g.mode === 'drag') latest.current.onDragEnd?.({ point: pointOf(event) })
    if (g.mode === 'pending') latest.current.onTap?.(info)
    if (g.mode === 'swipe' && Math.abs(info.dx) >= swipeThresholdPx && Math.abs(info.dx) > Math.abs(info.dy)) {
      latest.current.onSwipe?.(info)
    }
  }

  const onPointerCancel = (event) => {
    const g = gesture.current
    if (g === IDLE || isOther(event)) return
    clearTimer()
    gesture.current = IDLE
    if (g.mode === 'drag') latest.current.onDragCancel?.()
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
