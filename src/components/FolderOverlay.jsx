import { useLayoutEffect } from 'react'
import { APPS } from '../model/catalog.js'
import { resolveFolderTap } from '../gestures/resolveTap.js'
import { zoomFolderIn, zoomFolderOut } from '../motion/folderZoom.js'
import { canAnimate } from '../motion/motionEnv.js'
import { useHeld, usePresence } from '../motion/usePresence.js'
import { AppIcon } from './AppIcon.jsx'
import { SelectedPill } from './SelectedPill.jsx'
import { useModalFocus } from './useModalFocus.js'
import { useShakeOnChange } from './useShakeOnChange.js'
import styles from './FolderOverlay.module.css'

const KEY_ACTIVATORS = ['Enter', ' ']
// Two identical keyframes under different names restart the animation on each refusal.
const SHAKE_CLASS = { none: '', a: styles.shakeA, b: styles.shakeB }

const cx = (...names) => names.filter(Boolean).join(' ')

// The folder's apps. `gestures` (from useHomeGestures) turns a tap on an app into a
// Move Out toggle in edit mode and a press-and-move into a drag out; there is no
// onClick, because the panel's pointer capture makes the browser click the panel.
// Enter/Space toggles the focused app.
function FolderApps({ folder, editMode, selection, shake, gestures, dispatch }) {
  const onKeyDown = (event) => {
    if (!KEY_ACTIVATORS.includes(event.key)) return
    const action = resolveFolderTap(event.target, { editMode })
    if (action === null) return
    event.preventDefault()
    dispatch(action)
  }
  return (
    <div
      className={cx(styles.panel, SHAKE_CLASS[shake])}
      data-folder-panel
      data-shake={shake}
      onKeyDown={onKeyDown}
      {...gestures}
    >
      {folder.appIds
        .filter((id) => APPS[id] !== undefined)
        .map((id, index) => (
          <AppIcon key={id} app={APPS[id]} editMode={editMode} selected={selection.includes(id)} jiggleIndex={index} />
        ))}
    </div>
  )
}

function MoveOutButton({ disabled, dispatch }) {
  return (
    <button
      type="button"
      className={styles.moveOut}
      data-control="move-out"
      disabled={disabled}
      onClick={() => dispatch({ type: 'MOVE_OUT_OF_FOLDER' })}
    >
      Move Out
    </button>
  )
}

// Folder name, with the "N selected" pill beside it while editing (the name stays put).
function FolderHeader({ folder, editMode, selection, titleId }) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title} id={titleId}>{folder.name}</h2>
      <SelectedPill count={editMode ? selection.length : 0} className={styles.badge} data-folder-badge />
    </div>
  )
}

// Right-click inside an open folder enters edit mode and never closes the folder. On
// touch the long-press does that (see useHomeGestures), so its contextmenu is ignored.
const enterEditOnContextMenu = (editMode, dispatch, wasTouch) => (event) => {
  event.preventDefault()
  event.stopPropagation()
  if (!editMode && !wasTouch()) dispatch({ type: 'ENTER_EDIT' })
}

// The open dialog. While `closing` it is inert and plays its exit (see FolderOverlay).
// While an app is dragged out it fades and lets the pointer through to the home screen.
function FolderDialog({ folder, editMode, selection, dragging, closing, rootRef, shakeKey, gestures, wasTouch, dispatch }) {
  const close = () => dispatch({ type: 'CLOSE_FOLDER' })
  useModalFocus({
    rootRef,
    initialSelector: '[data-item]',
    restoreSelector: `[data-item="folder:${folder.id}"] [role="button"]`,
    onClose: close,
    active: !closing,
  })
  useLayoutEffect(() => {
    const zoom = canAnimate() ? zoomFolderIn(rootRef.current, folder.id) : null
    return () => zoom?.cancel()
  }, [rootRef, folder.id])
  const shake = useShakeOnChange(shakeKey, !closing)
  const titleId = `folder-title-${folder.id}`
  return (
    <div
      className={cx(styles.layer, closing && styles.closing, dragging && styles.dragging)}
      data-folder-overlay={folder.id}
      data-dragging={dragging ? 'true' : undefined}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      inert={closing}
      onContextMenu={enterEditOnContextMenu(editMode, dispatch, wasTouch)}
    >
      <div className={styles.backdrop} data-overlay-backdrop onClick={close} />
      <div className={styles.content} data-folder-content>
        <FolderHeader folder={folder} editMode={editMode} selection={selection} titleId={titleId} />
        <FolderApps {...{ folder, editMode, selection, shake, gestures, dispatch }} />
        {editMode && <MoveOutButton disabled={selection.length === 0} dispatch={dispatch} />}
      </div>
    </div>
  )
}

// Expanded folder: frosted panel of its apps; in edit mode apps are selectable for Move Out
// and can be dragged out. Rendered outside the home-screen gesture surface so taps here
// never swipe the pager. It zooms out of the folder icon on open and back into it on
// close; a close caused by a drop keeps the faded look (held from the last open render).
const NEVER_TOUCH = () => false

export function FolderOverlay({
  folder, editMode, selection, dragging = false, shakeKey = 0, gestures, wasTouch = NEVER_TOUCH, dispatch,
}) {
  const open = folder !== undefined
  const held = useHeld(open, { folder, editMode, selection, dragging })
  const { mounted, closing, ref } = usePresence(open, zoomFolderOut)
  if (!mounted) return null
  return (
    <FolderDialog
      {...held}
      {...{ closing, shakeKey, gestures, wasTouch, dispatch }}
      rootRef={ref}
    />
  )
}
