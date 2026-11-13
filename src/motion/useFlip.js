import { useLayoutEffect, useRef } from 'react'
import { flyIntoFolders } from './flipDepart.js'
import { measureItems, planFlips } from './flipPlan.js'
import { canAnimate } from './motionEnv.js'
import { SNAPPY_MS, SPRING_SNAPPY } from './springs.js'

const NO_SETTLE = () => null
const NO_DESTINATION = () => null

// FLIP for the home screen: after each commit where `deps` changed, every [data-flip]
// wrapper inside the container whose layout slot moved animates from its old place to
// the new one with the snappy spring. Wrappers (not the jiggling [data-item] inside)
// carry the transform. Options:
// - takeSettle() may hand over { key, point } once, for a drag drop: that item flies in
//   from the ghost at `point` (viewport px) instead.
// - destinationOf(key) names where a vanished item went ({ target, order } or null): items
//   that went into a folder fly into its tile in `order`, then the folder pops.
export function useFlip(containerRef, deps, { takeSettle = NO_SETTLE, destinationOf = NO_DESTINATION } = {}) {
  const prevRef = useRef(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (container === null) return
    const next = measureItems(container)
    const prev = prevRef.current
    const settle = takeSettle()
    prevRef.current = next
    if (prev === null || !canAnimate()) return
    planFlips({ container, prev, next, settle }).forEach(({ el, keyframes, composite, delay }) => {
      el.animate(keyframes, {
        duration: SNAPPY_MS,
        easing: SPRING_SNAPPY,
        delay,
        fill: 'backwards',
        composite,
      })
    })
    // After the FLIPs: the folder pop is additive and must stack on top of an arrival.
    flyIntoFolders({ container, prev, next, settle, destinationOf })
    // Callers pass the values that move items (layout, drag state) as deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
