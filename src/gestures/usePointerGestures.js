import { useEffect, useRef } from 'react'
import { useClock } from '../clock/ClockContext.jsx'
import { beginGesture, endGesture, markLongPress, moveGesture } from './gestureMachine.js'

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

// A gesture whose pointer lost capture without an up/cancel would wedge input.
const lostCapture = (event, g) =>
  typeof event.currentTarget.hasPointerCapture === 'function' &&
  !event.currentTarget.hasPointerCapture(g.pointerId)

const pointOf = (event) => ({ x: event.clientX, y: event.clientY })

const isOther = (g, event) => g.current !== IDLE && g.current.pointerId !== event.pointerId

function clearTimer({ clock, timer }) {
  if (timer.current !== null) clock.clearTimeout(timer.current)
  timer.current = null
}

function abandon(ctx) {
  clearTimer(ctx)
  const wasDrag = ctx.gesture.current !== IDLE && ctx.gesture.current.mode === 'drag'
  ctx.gesture.current = IDLE
  if (wasDrag) ctx.latest.current.onDragCancel?.()
}

function armLongPress(ctx, start) {
  const { clock, latest, gesture, timer, settings } = ctx
  if (!latest.current.onLongPress) return
  timer.current = clock.setTimeout(() => {
    timer.current = null
    if (gesture.current === IDLE || gesture.current.mode !== 'pending') return
    gesture.current = markLongPress(gesture.current)
    latest.current.onLongPress?.({ target: start.target, dx: 0, dy: 0 })
  }, settings.longPressMs)
}

const makeDown = (ctx) => (event) => {
  if (event.button > 0) return
  if (isOther(ctx.gesture, event) && !lostCapture(event, ctx.gesture.current)) return
  if (ctx.gesture.current !== IDLE) abandon(ctx)
  capture(event)
  const start = beginGesture({ ...pointOf(event), target: event.target, pointerId: event.pointerId })
  ctx.gesture.current = start
  armLongPress(ctx, start)
}

const makeMove = (ctx) => (event) => {
  const { gesture, latest, settings } = ctx
  const g = gesture.current
  if (g === IDLE || isOther(gesture, event)) return
  const point = pointOf(event)
  const canDrag = (info) => latest.current.canDrag?.(info) === true
  const { next, events } = moveGesture(g, point, { ...settings, scale: settings.getScale(), canDrag })
  if (next.mode !== 'pending') clearTimer(ctx)
  gesture.current = next
  if (events.includes('dragStart')) latest.current.onDragStart?.({ target: g.target, point: { x: g.x, y: g.y } })
  if (events.includes('dragMove')) latest.current.onDragMove?.({ point })
}

const makeUp = (ctx) => (event) => {
  const { gesture, latest, settings } = ctx
  const g = gesture.current
  if (g === IDLE || isOther(gesture, event)) return
  clearTimer(ctx)
  gesture.current = IDLE
  const point = pointOf(event)
  const { events, info } = endGesture(g, point, { ...settings, scale: settings.getScale() })
  if (events.includes('dragEnd')) latest.current.onDragEnd?.({ point })
  if (events.includes('tap')) latest.current.onTap?.(info)
  if (events.includes('swipe')) latest.current.onSwipe?.(info)
}

const makeCancel = (ctx) => (event) => {
  if (ctx.gesture.current === IDLE || isOther(ctx.gesture, event)) return
  abandon(ctx)
}

// Thin hook over the pure gesture machine: timers, pointer bookkeeping, callbacks.
// Callbacks: onTap, onLongPress, onSwipe receive { target, dx, dy };
// canDrag({ target }) decides whether a move becomes a drag instead of a swipe, and
// a drag reports onDragStart({ target, point }), onDragMove({ point }),
// onDragEnd({ point }) and onDragCancel(). Only the pointer that pressed is followed.
export function usePointerGestures(handlers, options = {}) {
  const clock = useClock()
  const latest = useRef(handlers)
  const gesture = useRef(IDLE)
  const timer = useRef(null)
  const ctx = { clock, latest, gesture, timer, settings: { ...DEFAULT_GESTURE_OPTIONS, ...options } }

  useEffect(() => {
    latest.current = handlers
  })
  useEffect(() => () => clearTimer({ clock, timer }), [clock])

  // Handlers are built per event so refs are only read inside event handlers.
  const cancel = (event) => makeCancel(ctx)(event)
  return {
    onPointerDown: (event) => makeDown(ctx)(event),
    onPointerMove: (event) => makeMove(ctx)(event),
    onPointerUp: (event) => makeUp(ctx)(event),
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
  }
}
