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

// Settles when every animation's `finished` settles; cancellation counts as done. Under
// the stepped recorder (Ruling T9-b) `finished` resolves only when the recorder calls
// `animation.finish()` at the end of a finite animation; seeking alone never resolves it.
export function allFinished(animations) {
  return Promise.allSettled(animations.map((animation) => animation.finished))
}

// Runs `callback` once the element's own animations/transitions settle (or at once if
// none). Returns a cancel function. Never a timer or a clock read: it waits on
// `finished`, which the stepped recorder resolves via `animation.finish()` (Ruling T9-b).
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
