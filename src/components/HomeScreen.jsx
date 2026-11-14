import { useRef } from 'react'
import { PAGE_COUNT } from '../model/constants.js'
import { useFlip } from '../motion/useFlip.js'
import { folderOfApp } from '../model/folders.js'
import { isPageSnapped } from '../model/snap.js'
import { useHomeGestures } from '../gestures/useHomeGestures.js'
import { useLastPointerType } from '../gestures/useLastPointerType.js'
import { DragContext } from './DragContext.js'
import { DragGhost } from './DragGhost.jsx'
import { Dock } from './Dock.jsx'
import { EditControls } from './EditControls.jsx'
import { FolderOverlay } from './FolderOverlay.jsx'
import { MoveSheet } from './MoveSheet.jsx'
import { Pager } from './Pager.jsx'
import { PageIndicator } from './PageIndicator.jsx'
import { StatusBar } from './StatusBar.jsx'
import { useKeyboardActivation } from './useKeyboardActivation.js'
import { useShakeOnChange } from './useShakeOnChange.js'
import { Toast } from './Toast.jsx'
import styles from './HomeScreen.module.css'

// Two identical keyframes under different names restart the animation on each refusal.
const SHAKE_CLASS = { none: '', a: styles.shakeA, b: styles.shakeB }
const APP_PREFIX = 'app:'

// For FLIP: an app key that left the grid into a folder → that folder's key and the
// app's place in it (selection order), so the app can fly into the folder tile.
const folderDestination = (layout) => (itemKey) => {
  if (!itemKey.startsWith(APP_PREFIX)) return null
  const home = folderOfApp(layout, itemKey.slice(APP_PREFIX.length))
  return home === null ? null : { target: `folder:${home.folderId}`, order: home.index }
}

// Status bar, page dots and edit controls; inert while a sheet or folder covers the screen.
function HomeChrome({ state, dispatch, covered }) {
  const { layout, page, editMode, selection } = state
  return (
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
  )
}

// True while the drag in flight lifted an app out of the open folder.
const isFolderDrag = (openFolder, dragging) =>
  openFolder !== undefined && dragging !== null && openFolder.appIds.some((id) => `${APP_PREFIX}${id}` === dragging)

// Folder overlay, move sheet and the drag ghost.
function Overlays({ state, dispatch, openFolder, drag, folderGestures, wasTouch }) {
  const { layout, editMode, selection, sheet, shakeKey, folderSelection } = state
  return (
    <>
      <FolderOverlay
        folder={openFolder}
        editMode={editMode}
        selection={folderSelection}
        dragging={isFolderDrag(openFolder, drag.dragging)}
        shakeKey={shakeKey}
        gestures={folderGestures}
        wasTouch={wasTouch}
        dispatch={dispatch}
      />
      <MoveSheet
        open={sheet !== null}
        view={sheet}
        count={selection.length}
        hasFolder={selection.some((ref) => ref.type === 'folder')}
        folders={layout.folders}
        shakeKey={shakeKey}
        dispatch={dispatch}
      />
      {drag.dragging !== null && drag.ghostPosition !== null && (
        <DragGhost itemKey={drag.dragging} position={drag.ghostPosition} folders={layout.folders} />
      )}
    </>
  )
}

// Desktop shortcut for hand use (the video uses a long-press): right-click toggles
// edit mode. The open folder handles its own right-click; the sheet ignores it. A
// touch long-press also fires contextmenu, but long-press owns touch, so it is ignored.
const contextMenuToggle = ({ sheet, editMode }, dispatch, wasTouch) => (event) => {
  event.preventDefault()
  if (sheet !== null || wasTouch()) return
  dispatch({ type: editMode ? 'EXIT_EDIT' : 'ENTER_EDIT' })
}

// The home screen, rendered from reducer state; turns gestures into reducer actions.
export function HomeScreen({ state, dispatch }) {
  const { layout, page, editMode, selection, toast, shakeKey, sheet, openFolderId } = state
  const openFolder = openFolderId === null ? undefined : layout.folders[openFolderId]
  const { gestures, folderGestures, drag, dragView, homeRef } = useHomeGestures({ state, dispatch })
  const { onPointerDownCapture, wasTouch } = useLastPointerType()
  // A drag out of the folder must hit-test the slots behind it, so they stop being inert.
  const folderOpen = openFolder !== undefined && !isFolderDrag(openFolder, drag.dragging)
  const covered = sheet !== null || folderOpen
  // Icons glide to new slots on layout changes; a drop settles from the ghost.
  const surfaceRef = useRef(null)
  useFlip(surfaceRef, [layout, drag.dragging], {
    takeSettle: drag.takeSettle,
    destinationOf: folderDestination(layout),
  })

  // The sheet and the open folder shake themselves on a refusal.
  const shake = useShakeOnChange(shakeKey, sheet === null && openFolder === undefined)
  const onKeyDown = useKeyboardActivation({ state, dispatch, surfaceRef })

  return (
    <DragContext.Provider value={dragView}>
      <div
        ref={homeRef}
        className={styles.home}
        onPointerDownCapture={onPointerDownCapture}
        onContextMenu={contextMenuToggle(state, dispatch, wasTouch)}
        data-edit-mode={String(editMode)}
      >
        <div
          ref={surfaceRef}
          className={`${styles.surface} ${SHAKE_CLASS[shake]}`}
          data-shake={shake}
          inert={covered}
          onKeyDown={onKeyDown}
          {...gestures}
        >
          <Pager pages={layout.pages} folders={layout.folders} page={page} editMode={editMode} selection={selection} />
          <Dock cells={layout.dock} folders={layout.folders} editMode={editMode} selection={selection} />
        </div>
        <HomeChrome state={state} dispatch={dispatch} covered={covered} />
        <Overlays {...{ state, dispatch, openFolder, drag, folderGestures, wasTouch }} />
        <Toast toast={toast} dispatch={dispatch} />
      </div>
    </DragContext.Provider>
  )
}
