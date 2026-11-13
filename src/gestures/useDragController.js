import { useCallback, useEffect, useRef, useState } from 'react'
import { PAGE_COUNT } from '../model/constants.js'
import { measureScreen } from './screenMetrics.js'
import { parseItem, parseSlot } from './resolveTap.js'

export const EDGE_ZONE_PX = 24
export const EDGE_HOLD_MS = 600

const IDLE_VIEW = { dragging: null, ghostPosition: null, hoverTarget: null }

const hitSlotName = (point) =>
  document.elementFromPoint?.(point.x, point.y)?.closest('[data-slot]')?.getAttribute('data-slot') ?? null

function edgeOf(point, screen) {
  const zone = EDGE_ZONE_PX * screen.scale
  if (point.x - screen.left < zone) return 'left'
  if (screen.right - point.x < zone) return 'right'
  return null
}

// Owns one pointer drag: ghost position (phone px), hovered slot, edge-hover page
// turns and the final DROP dispatch. The gesture hook feeds it points in viewport px.
export function useDragController({ dispatch, page, clock, getScreen }) {
  const [view, setView] = useState(IDLE_VIEW)
  const live = useRef({ key: null, edge: null, timer: null, page })

  useEffect(() => {
    live.current.page = page
  }, [page])

  const stopTimer = useCallback(() => {
    if (live.current.timer !== null) clock.clearTimeout(live.current.timer)
    live.current.timer = null
  }, [clock])

  useEffect(() => stopTimer, [stopTimer])

  const armTurn = useCallback(
    function arm(side) {
      const delta = side === 'right' ? 1 : -1
      const next = live.current.page + delta
      if (next < 0 || next >= PAGE_COUNT) return
      live.current.timer = clock.setTimeout(() => {
        live.current.timer = null
        live.current.page = next
        dispatch({ type: 'GO_TO_PAGE', page: next })
        arm(side)
      }, EDGE_HOLD_MS)
    },
    [clock, dispatch],
  )

  const reset = useCallback(() => {
    stopTimer()
    live.current = { ...live.current, key: null, edge: null }
    setView(IDLE_VIEW)
  }, [stopTimer])

  const start = useCallback((itemKey) => {
    live.current = { ...live.current, key: itemKey, edge: null }
  }, [])

  const move = useCallback(
    (point) => {
      if (live.current.key === null) return
      const screen = measureScreen(getScreen())
      const edge = edgeOf(point, screen)
      if (edge !== live.current.edge) {
        stopTimer()
        live.current.edge = edge
        if (edge !== null) armTurn(edge)
      }
      setView({
        dragging: live.current.key,
        ghostPosition: { x: (point.x - screen.left) / screen.scale, y: (point.y - screen.top) / screen.scale },
        hoverTarget: hitSlotName(point),
      })
    },
    [armTurn, getScreen, stopTimer],
  )

  const end = useCallback(
    (point) => {
      const key = live.current.key
      const slotName = key === null ? null : hitSlotName(point)
      reset()
      if (slotName !== null) dispatch({ type: 'DROP', ref: parseItem(key), target: parseSlot(slotName) })
    },
    [dispatch, reset],
  )

  return { ...view, start, move, end, cancel: reset }
}
