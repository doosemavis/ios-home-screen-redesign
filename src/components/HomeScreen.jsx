import { PAGE_COUNT } from '../model/constants.js'
import { isPageSnapped } from '../model/snap.js'
import { resolveTap } from '../gestures/resolveTap.js'
import { usePointerGestures } from '../gestures/usePointerGestures.js'
import { Dock } from './Dock.jsx'
import { EditControls } from './EditControls.jsx'
import { FolderOverlay } from './FolderOverlay.jsx'
import { MoveSheet } from './MoveSheet.jsx'
import { Pager } from './Pager.jsx'
import { PageIndicator } from './PageIndicator.jsx'
import { StatusBar } from './StatusBar.jsx'
import { Toast } from './Toast.jsx'
import styles from './HomeScreen.module.css'

// Two identical keyframes under different names restart the animation on each refusal.
const shakeState = (shakeKey) => (shakeKey === 0 ? 'none' : shakeKey % 2 === 1 ? 'a' : 'b')
const SHAKE_CLASS = { none: '', a: styles.shakeA, b: styles.shakeB }
const KEY_ACTIVATORS = ['Enter', ' ']

// The home screen, rendered from reducer state; turns gestures into reducer actions.
export function HomeScreen({ state, dispatch }) {
  const { layout, page, editMode, selection, toast, shakeKey, sheet, openFolderId, folderSelection } = state
  const openFolder = openFolderId === null ? undefined : layout.folders[openFolderId]
  const covered = sheet !== null || openFolder !== undefined

  const gestures = usePointerGestures({
    onTap: ({ target }) => {
      const action = resolveTap(target, state)
      if (action !== null) dispatch(action)
    },
    onLongPress: editMode ? undefined : () => dispatch({ type: 'ENTER_EDIT' }),
    // Drag-and-drop arrives later; for now an icon drag is simply swallowed.
    onDragStart: ({ target }) => editMode && target.closest('[data-item]') !== null,
    onSwipe: ({ dx }) => dispatch({ type: 'GO_TO_PAGE', page: page + (dx < 0 ? 1 : -1) }),
  })

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

  const shake = shakeState(shakeKey)

  return (
    <div className={styles.home} onContextMenu={handleContextMenu} data-edit-mode={String(editMode)}>
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
      {openFolder !== undefined && (
        <FolderOverlay folder={openFolder} editMode={editMode} selection={folderSelection} dispatch={dispatch} />
      )}
      {sheet !== null && (
        <MoveSheet view={sheet} count={selection.length} folders={layout.folders} dispatch={dispatch} />
      )}
      <Toast toast={toast} dispatch={dispatch} />
    </div>
  )
}
