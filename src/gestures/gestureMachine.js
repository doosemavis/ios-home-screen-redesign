// Pure transitions for one pointer gesture. State is { mode, x, y, target, pointerId }
// with mode 'pending' | 'longpress' | 'drag' | 'swipe'. Nothing here touches the DOM.
// Distances are divided by `scale` so thresholds are in phone px, not screen px.

export const beginGesture = ({ x, y, target, pointerId }) => ({ mode: 'pending', x, y, target, pointerId })

export const markLongPress = (g) => (g.mode === 'pending' ? { ...g, mode: 'longpress' } : g)

const delta = (g, point, scale) => ({ dx: (point.x - g.x) / scale, dy: (point.y - g.y) / scale })

// Returns { next, events } where events name the callbacks to fire, in order.
export function moveGesture(g, point, { scale, moveThresholdPx, canDrag }) {
  if (g.mode === 'drag') return { next: g, events: ['dragMove'] }
  if (g.mode !== 'pending') return { next: g, events: [] }
  const { dx, dy } = delta(g, point, scale)
  if (Math.hypot(dx, dy) <= moveThresholdPx) return { next: g, events: [] }
  if (canDrag({ target: g.target })) return { next: { ...g, mode: 'drag' }, events: ['dragStart', 'dragMove'] }
  return { next: { ...g, mode: 'swipe' }, events: [] }
}

// Returns the terminal events for a release; `info` carries phone-px dx/dy.
export function endGesture(g, point, { scale, swipeThresholdPx }) {
  const { dx, dy } = delta(g, point, scale)
  const info = { target: g.target, dx, dy }
  if (g.mode === 'drag') return { events: ['dragEnd'], info }
  if (g.mode === 'pending') return { events: ['tap'], info }
  const isSwipe = g.mode === 'swipe' && Math.abs(dx) >= swipeThresholdPx && Math.abs(dx) > Math.abs(dy)
  return { events: isSwipe ? ['swipe'] : [], info }
}
