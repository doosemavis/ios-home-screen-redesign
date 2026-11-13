import { useCallback, useEffect, useRef } from 'react'
import { PAGE_COUNT } from '../model/constants.js'

export const EDGE_ZONE_PX = 24
export const EDGE_HOLD_MS = 600

// Which screen edge (if any) a point sits in; `screen` is a measureScreen() result.
export function edgeOf(point, screen) {
  const zone = EDGE_ZONE_PX * screen.scale
  if (point.x - screen.left < zone) return 'left'
  if (screen.right - point.x < zone) return 'right'
  return null
}

// Turns the page after the pointer rests in an edge zone for EDGE_HOLD_MS, and keeps
// turning while it stays there. setEdge(null) or stop() cancels; unmount cancels too.
export function useEdgePageTurn({ dispatch, page, clock }) {
  const state = useRef({ edge: null, timer: null, page })

  useEffect(() => {
    state.current.page = page
  }, [page])

  const stop = useCallback(() => {
    if (state.current.timer !== null) clock.clearTimeout(state.current.timer)
    state.current = { ...state.current, timer: null, edge: null }
  }, [clock])

  useEffect(() => stop, [stop])

  const arm = useCallback(
    function armTurn(side) {
      const next = state.current.page + (side === 'right' ? 1 : -1)
      if (next < 0 || next >= PAGE_COUNT) return
      state.current.timer = clock.setTimeout(() => {
        state.current.timer = null
        state.current.page = next
        dispatch({ type: 'GO_TO_PAGE', page: next })
        armTurn(side)
      }, EDGE_HOLD_MS)
    },
    [clock, dispatch],
  )

  const setEdge = useCallback(
    (edge) => {
      if (edge === state.current.edge) return
      stop()
      state.current.edge = edge
      if (edge !== null) arm(edge)
    },
    [arm, stop],
  )

  return { setEdge, stop }
}
