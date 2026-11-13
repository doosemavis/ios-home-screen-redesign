import { useRef } from 'react'
import { APPS } from '../model/catalog.js'
import { AppIcon } from './AppIcon.jsx'
import { useModalFocus } from './useModalFocus.js'
import styles from './FolderOverlay.module.css'

const KEY_ACTIVATORS = ['Enter', ' ']

// Expanded folder: frosted panel of its apps; in edit mode apps are selectable for Move Out.
// Rendered outside the home-screen gesture surface so taps here never swipe the pager.
export function FolderOverlay({ folder, editMode, selection, dispatch }) {
  const rootRef = useRef(null)
  useModalFocus({
    rootRef,
    initialSelector: '[data-item]',
    restoreSelector: `[data-item="folder:${folder.id}"] [role="button"]`,
    onClose: () => dispatch({ type: 'CLOSE_FOLDER' }),
  })
  const titleId = `folder-title-${folder.id}`
  const toggle = (target) => {
    const item = target.closest('[data-item]')
    if (item === null || !editMode) return
    const appId = item.getAttribute('data-item').slice('app:'.length)
    dispatch({ type: 'TOGGLE_FOLDER_SELECT', appId })
  }
  return (
    <div
      className={styles.layer}
      data-folder-overlay={folder.id}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={styles.backdrop}
        data-overlay-backdrop
        onClick={() => dispatch({ type: 'CLOSE_FOLDER' })}
      />
      <div className={styles.content}>
        <h2 className={styles.title} id={titleId}>{folder.name}</h2>
        <div
          className={styles.panel}
          onClick={(event) => toggle(event.target)}
          onKeyDown={(event) => {
            if (!KEY_ACTIVATORS.includes(event.key)) return
            event.preventDefault()
            toggle(event.target)
          }}
        >
          {folder.appIds
            .filter((id) => APPS[id] !== undefined)
            .map((id, index) => (
              <AppIcon
                key={id}
                app={APPS[id]}
                editMode={editMode}
                selected={selection.includes(id)}
                jiggleIndex={index}
              />
            ))}
        </div>
        {editMode && (
          <button
            type="button"
            className={styles.moveOut}
            data-control="move-out"
            disabled={selection.length === 0}
            onClick={() => dispatch({ type: 'MOVE_OUT_OF_FOLDER' })}
          >
            Move Out
          </button>
        )}
      </div>
    </div>
  )
}
