import { useCallback, useEffect, useRef, useState } from 'react'
import { whenAnimationsSettle } from '../motion/motionEnv.js'
import { measureScreen } from './screenMetrics.js'
import { parseItem, parseSlot } from './resolveTap.js'
import { edgeOf, useEdgePageTurn } from './useEdgePageTurn.js'

const IDLE_VIEW = { dragging: null, ghostPosition: null, hoverTarget: null }

const hitSlotName = (point) =>
  document.elementFromPoint?.(point.x, point.y)?.closest('[data-slot]')?.getAttribute('data-slot') ?? null

const toPhonePx = (point, screen) => ({
  x: (point.x - screen.left) / screen.scale,
  y: (point.y - screen.top) / screen.scale,
})

const pagerTrack = (screen) => screen?.querySelector('[data-pager-track]') ?? null

// Slot under a point if releasing there would do something; re-evaluated when the
// page turns under a resting pointer so the glow never goes stale. The re-check waits
// for the pager's slide to finish, or elementFromPoint would hit the outgoing page.
function useHoverTarget({ live, page, isValidDrop, setView, getScreen }) {
  const validRef = useRef(isValidDrop)

  useEffect(() => {
    validRef.current = isValidDrop
  })

  const hoverAt = useCallback(
    (point, key) => {
      const slotName = hitSlotName(point)
      return slotName !== null && validRef.current(key, slotName) ? slotName : null
    },
    [],
  )

  useEffect(() => {
    if (live.current.key === null || live.current.point === null) return undefined
    return whenAnimationsSettle(pagerTrack(getScreen()), () => {
      const { key, point } = live.current
      if (key === null || point === null) return
      setView((v) => ({ ...v, hoverTarget: hoverAt(point, key) }))
    })
  }, [page, hoverAt, live, setView, getScreen])

  return hoverAt
}

// Owns one pointer drag: ghost position (phone px), hovered slot (valid targets only),
// edge-hover page turns and the final DROP dispatch. Points arrive in viewport px.
// `isValidDrop(key, slotName)` limits the glow; DROP itself is always validated by the model.
export function useDragController({ dispatch, page, clock, getScreen, isValidDrop = () => true }) {
  const [view, setView] = useState(IDLE_VIEW)
  const live = useRef({ key: null, point: null })
  const edgeTurn = useEdgePageTurn({ dispatch, page, clock })
  const hoverAt = useHoverTarget({ live, page, isValidDrop, setView, getScreen })
  // Where the ghost was released, handed once to the FLIP pass so the icon settles from there.
  const settle = useRef(null)
  const takeSettle = useCallback(() => {
    const dropped = settle.current
    settle.current = null
    return dropped
  }, [])

  const reset = useCallback(() => {
    edgeTurn.stop()
    live.current = { key: null, point: null }
    setView(IDLE_VIEW)
  }, [edgeTurn])

  const start = useCallback((itemKey) => {
    live.current = { key: itemKey, point: null }
    settle.current = null
  }, [])

  const move = useCallback(
    (point) => {
      if (live.current.key === null) return
      live.current.point = point
      const screen = measureScreen(getScreen())
      edgeTurn.setEdge(edgeOf(point, screen))
      setView({
        dragging: live.current.key,
        ghostPosition: toPhonePx(point, screen),
        hoverTarget: hoverAt(point, live.current.key),
      })
    },
    [edgeTurn, getScreen, hoverAt],
  )

  const end = useCallback(
    (point) => {
      const { key, point: lastMove } = live.current
      const slotName = key === null ? null : hitSlotName(point)
      // Only a drag that showed a ghost settles; it also clears `dragging`, which reruns FLIP.
      settle.current = key !== null && lastMove !== null ? { key, point } : null
      reset()
      if (slotName !== null) dispatch({ type: 'DROP', ref: parseItem(key), target: parseSlot(slotName) })
    },
    [dispatch, reset],
  )

  return { ...view, start, move, end, cancel: reset, takeSettle }
}
