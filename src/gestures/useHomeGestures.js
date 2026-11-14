import { useCallback, useMemo, useRef } from 'react'
import { useClock } from '../clock/ClockContext.jsx'
import { isValidDrop } from './dropValidity.js'
import { resolveFolderTap, resolveTap } from './resolveTap.js'
import { measureScreen } from './screenMetrics.js'
import { useDragController } from './useDragController.js'
import { usePointerGestures } from './usePointerGestures.js'

const itemKeyAt = (target, selector) => {
  if (target === null || typeof target.closest !== 'function') return null
  return target.closest(selector)?.getAttribute('data-item') ?? null
}

// The dragged item's key when the press began on an icon body (not its select control).
function draggableKey(target) {
  if (target === null || typeof target.closest !== 'function') return null
  if (target.closest('[data-control]') !== null) return null
  return itemKeyAt(target, '[data-item]')
}

// The dragged app's key when the press began on an app inside the open folder.
const folderAppKey = (target) => itemKeyAt(target, '[data-folder-panel] [data-item]')

// Handlers one drag source needs: when a press may drag, and which item it lifts.
// Both sources share the one drag controller, so ghost, glow, edge turns and DROP match.
function dragHandlers(drag, { editMode, keyOf }) {
  return {
    canDrag: ({ target }) => editMode && keyOf(target) !== null,
    onDragStart: ({ target }) => drag.start(keyOf(target)),
    onDragMove: ({ point }) => drag.move(point),
    onDragEnd: ({ point }) => drag.end(point),
    onDragCancel: drag.cancel,
  }
}

// Wires tap / long-press / swipe / drag on the home screen to reducer actions, and
// taps on and drags of apps in the open folder (its panel gets `folderGestures`). Returns the
// surface handlers, the folder-panel handlers, the drag controller, the context value
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
  const options = { getScale: () => measureScreen(homeRef.current).scale }
  const tapWith = (resolve) => ({ target }) => {
    const action = resolve(target, state)
    if (action !== null) dispatch(action)
  }
  const gestures = usePointerGestures(
    {
      ...dragHandlers(drag, { editMode, keyOf: draggableKey }),
      onTap: tapWith(resolveTap),
      onLongPress: editMode ? undefined : () => dispatch({ type: 'ENTER_EDIT' }),
      onSwipe: ({ dx }) => dispatch({ type: 'GO_TO_PAGE', page: page + (dx < 0 ? 1 : -1) }),
    },
    options,
  )
  // Both surfaces capture the pointer, so a browser sends their `click` to the surface
  // itself; taps therefore resolve from the pressed element the gesture machine saw.
  const folderGestures = usePointerGestures(
    { ...dragHandlers(drag, { editMode, keyOf: folderAppKey }), onTap: tapWith(resolveFolderTap) },
    options,
  )
  return { gestures, folderGestures, drag, dragView, homeRef }
}
