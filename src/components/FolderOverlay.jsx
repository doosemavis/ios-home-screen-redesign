import { useLayoutEffect } from 'react'
import { APPS } from '../model/catalog.js'
import { zoomFolderIn, zoomFolderOut } from '../motion/folderZoom.js'
import { canAnimate } from '../motion/motionEnv.js'
import { useHeld, usePresence } from '../motion/usePresence.js'
import { AppIcon } from './AppIcon.jsx'
import { useModalFocus } from './useModalFocus.js'
import styles from './FolderOverlay.module.css'

const KEY_ACTIVATORS = ['Enter', ' ']

// The folder's apps; in edit mode a tap or Enter/Space toggles an app for Move Out.
function FolderApps({ folder, editMode, selection, dispatch }) {
  const toggle = (target) => {
    const item = target.closest('[data-item]')
    if (item === null || !editMode) return
    const appId = item.getAttribute('data-item').slice('app:'.length)
    dispatch({ type: 'TOGGLE_FOLDER_SELECT', appId })
  }
  const onKeyDown = (event) => {
    if (!KEY_ACTIVATORS.includes(event.key)) return
    event.preventDefault()
    toggle(event.target)
  }
  return (
    <div className={styles.panel} data-folder-panel onClick={(event) => toggle(event.target)} onKeyDown={onKeyDown}>
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

// The open dialog. While `closing` it is inert and plays its exit (see FolderOverlay).
function FolderDialog({ folder, editMode, selection, closing, rootRef, dispatch }) {
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
  const titleId = `folder-title-${folder.id}`
  return (
    <div
      className={closing ? `${styles.layer} ${styles.closing}` : styles.layer}
      data-folder-overlay={folder.id}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      inert={closing}
    >
      <div className={styles.backdrop} data-overlay-backdrop onClick={close} />
      <div className={styles.content} data-folder-content>
        <h2 className={styles.title} id={titleId}>{folder.name}</h2>
        <FolderApps folder={folder} editMode={editMode} selection={selection} dispatch={dispatch} />
        {editMode && <MoveOutButton disabled={selection.length === 0} dispatch={dispatch} />}
      </div>
    </div>
  )
}

// Expanded folder: frosted panel of its apps; in edit mode apps are selectable for Move Out.
// Rendered outside the home-screen gesture surface so taps here never swipe the pager.
// It zooms out of the folder icon on open and back into it on close.
export function FolderOverlay({ folder, editMode, selection, dispatch }) {
  const open = folder !== undefined
  const held = useHeld(open, { folder, editMode, selection })
  const { mounted, closing, ref } = usePresence(open, zoomFolderOut)
  if (!mounted) return null
  return <FolderDialog {...held} closing={closing} rootRef={ref} dispatch={dispatch} />
}
