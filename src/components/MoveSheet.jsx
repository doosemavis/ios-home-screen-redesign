import { useState } from 'react'
import { FolderPreview } from './FolderIcon.jsx'
import styles from './MoveSheet.module.css'

const appCount = (n) => `Move ${n} ${n === 1 ? 'app' : 'apps'}`

function FolderRows({ folders, onPick, onNew }) {
  return (
    <div className={styles.rows}>
      {Object.values(folders).map((folder) => (
        <button
          key={folder.id}
          type="button"
          className={styles.row}
          data-folder-option={folder.id}
          aria-label={`Move to ${folder.name}`}
          onClick={() => onPick(folder.id)}
        >
          <FolderPreview folder={folder} className={styles.preview} />
          <span className={styles.name}>{folder.name}</span>
        </button>
      ))}
      <button type="button" className={styles.row} data-control="new-folder" onClick={onNew}>
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

// Bottom sheet: pick a destination folder, or name a new one.
export function MoveSheet({ view, count, folders, dispatch }) {
  const close = () => dispatch({ type: 'CLOSE_SHEET' })
  const creating = view === 'new-folder'
  return (
    <div className={styles.layer}>
      <div className={styles.backdrop} data-sheet-backdrop onClick={close} />
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={creating ? 'New Folder' : appCount(count)}
      >
        <div className={styles.grabber} aria-hidden="true" />
        <h2 className={styles.title}>{creating ? 'New Folder' : appCount(count)}</h2>
        {creating ? (
          <NewFolderForm onCreate={(name) => dispatch({ type: 'CREATE_FOLDER', name })} onCancel={close} />
        ) : (
          <>
            <FolderRows
              folders={folders}
              onPick={(folderId) => dispatch({ type: 'MOVE_SELECTION_TO_FOLDER', folderId })}
              onNew={() => dispatch({ type: 'SHOW_NEW_FOLDER' })}
            />
            <button type="button" className={styles.cancel} onClick={close}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
