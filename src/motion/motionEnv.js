// Environment checks shared by every WAAPI caller. jsdom has no Element.animate,
// so callers fall back to the instant (pre-motion) behaviour there.

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function supportsAnimate() {
  return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function'
}

// True when motion should play: WAAPI exists and the viewer has not asked for less motion.
export function canAnimate() {
  return supportsAnimate() && !prefersReducedMotion()
}

// Viewport px per layout px for an element inside the CSS-zoomed phone.
// getBoundingClientRect reports zoomed px; transforms are written in layout px.
export function viewScale(element) {
  const width = element.offsetWidth
  const rect = element.getBoundingClientRect()
  return width > 0 && rect.width > 0 ? rect.width / width : 1
}

// Resolves the finished promises of several animations; cancellation counts as done.
export function allFinished(animations) {
  return Promise.allSettled(animations.map((animation) => animation.finished))
}

// Runs `callback` once the element's own running animations/transitions finish (or at
// once if none). Returns a cancel function. Never a timer: it waits on `finished`.
export function whenAnimationsSettle(element, callback) {
  const running = element?.getAnimations?.() ?? []
  if (running.length === 0) {
    callback()
    return () => {}
  }
  let live = true
  allFinished(running).then(() => {
    if (live) callback()
  })
  return () => {
    live = false
  }
}
