// Drives every animation in the page from the virtual clock (Ruling T9-b). Each
// animation is paused and seeked to (virtual now - the virtual time it was first
// seen), so CSS animations, CSS transitions and WAAPI all advance in lockstep with
// the recorder's frames and never with real time. A finite animation whose stepped
// time reaches its end is finish()ed so `finished` resolves and presence exits,
// flying clones and settle hooks run; then the page is flushed and scanned again, so
// animations those handlers start are stepped within the same frame.
const DEFAULT_MAX_PASSES = 4

// endTime covers delay, every iteration and endDelay; infinite animations never end.
function hasEnded(animation) {
  const timing = animation.effect?.getComputedTiming?.()
  if (timing === undefined || !Number.isFinite(timing.endTime)) return false
  return animation.currentTime >= timing.endTime
}

export function createAnimationStepper({ getAnimations, flush, maxPasses = DEFAULT_MAX_PASSES }) {
  const firstSeen = new WeakMap()
  const settled = new WeakSet()

  // Seeks one animation; true when it is new this frame or was just finished.
  const stepOne = (animation, now) => {
    if (settled.has(animation)) return false
    const isNew = !firstSeen.has(animation)
    if (isNew) firstSeen.set(animation, now)
    animation.pause()
    animation.currentTime = now - firstSeen.get(animation)
    if (!hasEnded(animation)) return isNew
    animation.finish()
    settled.add(animation)
    return true
  }

  // One pass over the live animations; true if anything changed.
  const pass = (now) => getAnimations().reduce((changed, animation) => stepOne(animation, now) || changed, false)

  return {
    async step(now) {
      for (let i = 0; i < maxPasses; i += 1) {
        if (!pass(now)) return
        await flush()
      }
    },
  }
}
