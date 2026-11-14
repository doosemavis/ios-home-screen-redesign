import { useState } from 'react'
import { useHeld, usePresence } from '../motion/usePresence.js'
import { GENTLE_MS, SPRING_GENTLE } from '../motion/springs.js'
import { useShakeOnChange } from './useShakeOnChange.js'
import { useModalFocus } from './useModalFocus.js'
import { FolderPreview } from './FolderIcon.jsx'
import styles from './MoveSheet.module.css'

const SHAKE_CLASS = { none: '', a: styles.shakeA, b: styles.shakeB }
// "Move 2 apps", or "Move 2 items" once a folder is among them.
const titleFor = (n, hasFolder) => {
  const noun = hasFolder ? 'item' : 'app'
  return `Move ${n} ${noun}${n === 1 ? '' : 's'}`
}
const NO_NESTING_HINT = 'Folders can’t go inside folders'
const EXIT_TIMING = { duration: GENTLE_MS, easing: SPRING_GENTLE, fill: 'forwards' }

// Exit for usePresence: the sheet slides back down below the screen as the dim lifts.
function slideSheetOut(layer) {
  const sheet = layer.querySelector('[role="dialog"]')
  const backdrop = layer.querySelector('[data-sheet-backdrop]')
  return [
    sheet?.animate([{ transform: 'none' }, { transform: 'translateY(calc(100% + 16px))' }], EXIT_TIMING),
    backdrop?.animate([{ opacity: 1 }, { opacity: 0 }], EXIT_TIMING),
  ].filter(Boolean)
}

// Every destination here is a folder, so all of them are disabled while the selection
// holds a folder (folders can't nest); the hint says why.
function FolderRows({ folders, disabled, onPick, onNew }) {
  return (
    <div className={styles.rows}>
      {Object.values(folders).map((folder) => (
        <button
          key={folder.id}
          type="button"
          className={styles.row}
          data-folder-option={folder.id}
          aria-label={`Move to ${folder.name}`}
          disabled={disabled}
          onClick={() => onPick(folder.id)}
        >
          <FolderPreview folder={folder} className={styles.preview} />
          <span className={styles.name}>{folder.name}</span>
        </button>
      ))}
      <button type="button" className={styles.row} data-control="new-folder" disabled={disabled} onClick={onNew}>
        <span className={styles.plus} aria-hidden="true">+</span>
        <span className={styles.name}>New Folder</span>
      </button>
    </div>
  )
}

function NewFolderForm({ onCreate, onCancel }) {
  const [name, setName] = useState('')
  const blank = name.trim() === ''
  const submit = (event) => {
    event.preventDefault()
    if (!blank) onCreate(name)
  }
  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        className={styles.input}
        data-control="folder-name"
        aria-label="Folder name"
        placeholder="Folder name"
        value={name}
        autoFocus
        maxLength={24}
        onChange={(event) => setName(event.target.value)}
      />
      <button type="submit" className={styles.create} data-control="create-folder" disabled={blank}>
        Create
      </button>
      <button type="button" className={styles.cancel} onClick={onCancel}>
        Cancel
      </button>
    </form>
  )
}

// The sheet itself. While `closing` it is inert and slides away (see MoveSheet).
// Focus lands on the first destination that can be picked, else on Cancel.
const PICK_FOCUS = '[data-folder-option]:enabled, [data-control="new-folder"]:enabled, [data-sheet-cancel]'

function SheetDialog({ view, count, hasFolder, folders, shakeKey, closing, rootRef, dispatch }) {
  const shake = useShakeOnChange(shakeKey, !closing)
  const close = () => dispatch({ type: 'CLOSE_SHEET' })
  const creating = view === 'new-folder'
  useModalFocus({
    rootRef,
    initialSelector: creating ? '[data-control="folder-name"]' : PICK_FOCUS,
    restoreSelector: '[data-control="move"]',
    onClose: close,
    active: !closing,
  })
  return (
    <div className={closing ? `${styles.layer} ${styles.closing}` : styles.layer} ref={rootRef} inert={closing}>
      <div className={styles.backdrop} data-sheet-backdrop onClick={close} />
      <div
        className={`${styles.sheet} ${SHAKE_CLASS[shake]}`}
        data-shake={shake}
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-sheet-title"
      >
        <div className={styles.grabber} aria-hidden="true" />
        <h2 className={styles.title} id="move-sheet-title">{creating ? 'New Folder' : titleFor(count, hasFolder)}</h2>
        {creating ? (
          <NewFolderForm onCreate={(name) => dispatch({ type: 'CREATE_FOLDER', name })} onCancel={close} />
        ) : (
          <>
            {hasFolder && <p className={styles.hint}>{NO_NESTING_HINT}</p>}
            <FolderRows
              folders={folders}
              disabled={hasFolder}
              onPick={(folderId) => dispatch({ type: 'MOVE_SELECTION_TO_FOLDER', folderId })}
              onNew={() => dispatch({ type: 'SHOW_NEW_FOLDER' })}
            />
            <button type="button" className={styles.cancel} data-sheet-cancel onClick={close}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Bottom sheet: pick a destination folder, or name a new one (apps only: with a folder
// selected, every destination is disabled). Slides up on open and
// back down on close, still showing what it showed while it leaves.
export function MoveSheet({ open, view, count, hasFolder = false, folders, shakeKey, dispatch }) {
  const held = useHeld(open, { view, count, hasFolder, folders })
  const { mounted, closing, ref } = usePresence(open, slideSheetOut)
  if (!mounted) return null
  return <SheetDialog {...held} shakeKey={shakeKey} closing={closing} rootRef={ref} dispatch={dispatch} />
}
