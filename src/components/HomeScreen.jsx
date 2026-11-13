import { useCallback, useMemo, useRef } from 'react'
import { useClock } from '../clock/ClockContext.jsx'
import { PAGE_COUNT } from '../model/constants.js'
import { isPageSnapped } from '../model/snap.js'
import { resolveTap } from '../gestures/resolveTap.js'
import { measureScreen } from '../gestures/screenMetrics.js'
import { useDragController } from '../gestures/useDragController.js'
import { usePointerGestures } from '../gestures/usePointerGestures.js'
import { DragContext } from './DragContext.js'
import { DragGhost } from './DragGhost.jsx'
import { Dock } from './Dock.jsx'
import { EditControls } from './EditControls.jsx'
import { FolderOverlay } from './FolderOverlay.jsx'
import { MoveSheet } from './MoveSheet.jsx'
import { Pager } from './Pager.jsx'
import { PageIndicator } from './PageIndicator.jsx'
import { StatusBar } from './StatusBar.jsx'
import { useShakeOnChange } from './useShakeOnChange.js'
import { Toast } from './Toast.jsx'
import styles from './HomeScreen.module.css'

// Two identical keyframes under different names restart the animation on each refusal.
const SHAKE_CLASS = { none: '', a: styles.shakeA, b: styles.shakeB }
const KEY_ACTIVATORS = ['Enter', ' ']

// The dragged item's key when the press began on an icon body (not its select control).
function draggableKey(target) {
  if (target === null || typeof target.closest !== 'function') return null
  if (target.closest('[data-control]') !== null) return null
  return target.closest('[data-item]')?.getAttribute('data-item') ?? null
}

// The home screen, rendered from reducer state; turns gestures into reducer actions.
export function HomeScreen({ state, dispatch }) {
  const { layout, page, editMode, selection, toast, shakeKey, sheet, openFolderId, folderSelection } = state
  const openFolder = openFolderId === null ? undefined : layout.folders[openFolderId]
  const covered = sheet !== null || openFolder !== undefined

  const homeRef = useRef(null)
  const getScreen = useCallback(() => homeRef.current, [])
  const clock = useClock()
  const drag = useDragController({ dispatch, page, clock, getScreen })
  const dragView = useMemo(
    () => ({ sourceKey: drag.dragging, hoverTarget: drag.hoverTarget }),
    [drag.dragging, drag.hoverTarget],
  )

  const gestures = usePointerGestures({
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
  }, { getScale: () => measureScreen(homeRef.current).scale })

  const handleKeyDown = (event) => {
    if (!KEY_ACTIVATORS.includes(event.key)) return
    const action = resolveTap(event.target, state)
    if (action === null) return
    event.preventDefault()
    dispatch(action)
  }

  // Desktop shortcut for hand use; the video enters edit mode with a long-press.
  const handleContextMenu = (event) => {
    event.preventDefault()
    dispatch({ type: 'ENTER_EDIT' })
  }

  const shake = useShakeOnChange(shakeKey, sheet === null)

  return (
    <DragContext.Provider value={dragView}>
      <div ref={homeRef} className={styles.home} onContextMenu={handleContextMenu} data-edit-mode={String(editMode)}>
        <div
          className={`${styles.surface} ${SHAKE_CLASS[shake]}`}
          data-shake={shake}
          inert={covered}
          onKeyDown={handleKeyDown}
          {...gestures}
        >
          <Pager pages={layout.pages} folders={layout.folders} page={page} editMode={editMode} selection={selection} />
          <Dock cells={layout.dock} folders={layout.folders} editMode={editMode} selection={selection} />
        </div>
        <div className={styles.chrome} inert={covered}>
          <StatusBar editMode={editMode} onDone={() => dispatch({ type: 'EXIT_EDIT' })} />
          <PageIndicator
            editMode={editMode}
            page={page}
            pageCount={PAGE_COUNT}
            onSelectPage={(next) => dispatch({ type: 'GO_TO_PAGE', page: next })}
          />
          {editMode && (
            <EditControls
              selectedCount={selection.length}
              snapDisabled={isPageSnapped(layout, page)}
              onMove={() => dispatch({ type: 'OPEN_SHEET' })}
              onSnap={() => dispatch({ type: 'SNAP_PAGE' })}
            />
          )}
        </div>
        {openFolder !== undefined && (
          <FolderOverlay folder={openFolder} editMode={editMode} selection={folderSelection} dispatch={dispatch} />
        )}
        {sheet !== null && (
          <MoveSheet view={sheet} count={selection.length} folders={layout.folders} shakeKey={shakeKey} dispatch={dispatch} />
        )}
        {drag.dragging !== null && drag.ghostPosition !== null && (
          <DragGhost itemKey={drag.dragging} position={drag.ghostPosition} folders={layout.folders} />
        )}
        <Toast toast={toast} dispatch={dispatch} />
      </div>
    </DragContext.Provider>
  )
}
