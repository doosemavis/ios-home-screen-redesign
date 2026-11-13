import { useCallback, useMemo, useRef } from 'react'
import { useClock } from '../clock/ClockContext.jsx'
import { isValidDrop } from './dropValidity.js'
import { resolveTap } from './resolveTap.js'
import { measureScreen } from './screenMetrics.js'
import { useDragController } from './useDragController.js'
import { usePointerGestures } from './usePointerGestures.js'

// The dragged item's key when the press began on an icon body (not its select control).
function draggableKey(target) {
  if (target === null || typeof target.closest !== 'function') return null
  if (target.closest('[data-control]') !== null) return null
  return target.closest('[data-item]')?.getAttribute('data-item') ?? null
}

// Wires tap / long-press / swipe / drag on the home screen to reducer actions.
// Returns the surface pointer handlers, the drag controller, the context value
// for the grids, and the ref to attach to the screen element.
export function useHomeGestures({ state, dispatch }) {
  const { layout, page, editMode } = state
  const homeRef = useRef(null)
  const getScreen = useCallback(() => homeRef.current, [])
  const clock = useClock()
  const drag = useDragController({
    dispatch,
    page,
    clock,
    getScreen,
    isValidDrop: (key, slotName) => isValidDrop(layout, key, slotName),
  })
  const dragView = useMemo(
    () => ({ sourceKey: drag.dragging, hoverTarget: drag.hoverTarget }),
    [drag.dragging, drag.hoverTarget],
  )

  const handlers = {
    onTap: ({ target }) => {
      const action = resolveTap(target, state)
      if (action !== null) dispatch(action)
    },
    onLongPress: editMode ? undefined : () => dispatch({ type: 'ENTER_EDIT' }),
    canDrag: ({ target }) => editMode && draggableKey(target) !== null,
    onDragStart: ({ target }) => drag.start(draggableKey(target)),
    onDragMove: ({ point }) => drag.move(point),
    onDragEnd: ({ point }) => drag.end(point),
    onDragCancel: drag.cancel,
    onSwipe: ({ dx }) => dispatch({ type: 'GO_TO_PAGE', page: page + (dx < 0 ? 1 : -1) }),
  }
  const gestures = usePointerGestures(handlers, { getScale: () => measureScreen(homeRef.current).scale })
  return { gestures, drag, dragView, homeRef }
}
