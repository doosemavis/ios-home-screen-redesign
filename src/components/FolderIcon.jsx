import { APPS } from '../model/catalog.js'
import { ItemShell } from './ItemShell.jsx'
import styles from './FolderIcon.module.css'

const PREVIEW_COUNT = 9

function MiniApp({ app }) {
  const [top, bottom] = app.gradient
  return <span className={styles.mini} style={{ '--top': top, '--bottom': bottom }} />
}

// Frosted folder tile with a live 3×3 preview of its first apps.
export function FolderIcon({ folder, editMode, selected, jiggleIndex, showLabel }) {
  const preview = folder.appIds
    .slice(0, PREVIEW_COUNT)
    .map((id) => APPS[id])
    .filter(Boolean)
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
      <div
        className={styles.tile}
        role="button"
        tabIndex={editMode ? 0 : -1}
        aria-label={`${folder.name} folder`}
      >
        {preview.map((app) => (
          <MiniApp key={app.id} app={app} />
        ))}
      </div>
    </ItemShell>
  )
}
