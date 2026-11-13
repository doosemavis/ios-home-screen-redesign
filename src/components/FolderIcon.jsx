import { APPS } from '../model/catalog.js'
import { ItemShell } from './ItemShell.jsx'
import styles from './FolderIcon.module.css'

const PREVIEW_COUNT = 9

function MiniApp({ app }) {
  const [top, bottom] = app.gradient
  return <span className={styles.mini} style={{ '--top': top, '--bottom': bottom }} />
}

// The frosted 3×3 preview tile, reused by the Move sheet rows.
export function FolderPreview({ folder, className }) {
  const preview = folder.appIds
    .slice(0, PREVIEW_COUNT)
    .map((id) => APPS[id])
    .filter(Boolean)
  return (
    <div className={className === undefined ? styles.tile : `${styles.tile} ${className}`}>
      {preview.map((app) => (
        <MiniApp key={app.id} app={app} />
      ))}
    </div>
  )
}

// Frosted folder tile with a live 3×3 preview of its first apps.
export function FolderIcon({ folder, editMode, selected, jiggleIndex, showLabel }) {
  return (
    <ItemShell
      itemKey={`folder:${folder.id}`}
      label={folder.name}
      editMode={editMode}
      selected={selected}
      jiggleIndex={jiggleIndex}
      showLabel={showLabel}
      interactive={false}
      selectControl={`select:folder:${folder.id}`}
    >
      <div role="button" tabIndex={editMode ? 0 : -1} aria-label={`${folder.name} folder`}>
        <FolderPreview folder={folder} />
      </div>
    </ItemShell>
  )
}
