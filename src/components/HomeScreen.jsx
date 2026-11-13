import { PAGE_COUNT } from '../model/constants.js'
import { isPageSnapped } from '../model/snap.js'
import { resolveTap } from '../gestures/resolveTap.js'
import { useHomeGestures } from '../gestures/useHomeGestures.js'
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

// Folder overlay, move sheet and the drag ghost.
function Overlays({ state, dispatch, openFolder, drag }) {
  const { layout, editMode, selection, sheet, shakeKey, folderSelection } = state
  return (
    <>
      {openFolder !== undefined && (
        <FolderOverlay folder={openFolder} editMode={editMode} selection={folderSelection} dispatch={dispatch} />
      )}
      {sheet !== null && (
        <MoveSheet view={sheet} count={selection.length} folders={layout.folders} shakeKey={shakeKey} dispatch={dispatch} />
      )}
      {drag.dragging !== null && drag.ghostPosition !== null && (
        <DragGhost itemKey={drag.dragging} position={drag.ghostPosition} folders={layout.folders} />
      )}
    </>
  )
}

// The home screen, rendered from reducer state; turns gestures into reducer actions.
export function HomeScreen({ state, dispatch }) {
  const { layout, page, editMode, selection, toast, shakeKey, sheet, openFolderId } = state
  const openFolder = openFolderId === null ? undefined : layout.folders[openFolderId]
  const covered = sheet !== null || openFolder !== undefined

  const { gestures, drag, dragView, homeRef } = useHomeGestures({ state, dispatch })

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
        <HomeChrome state={state} dispatch={dispatch} covered={covered} />
        <Overlays state={state} dispatch={dispatch} openFolder={openFolder} drag={drag} />
        <Toast toast={toast} dispatch={dispatch} />
      </div>
    </DragContext.Provider>
  )
}
