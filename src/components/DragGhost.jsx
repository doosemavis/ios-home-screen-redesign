import { APPS } from '../model/catalog.js'
import { parseItem } from '../gestures/resolveTap.js'
import { AppTile } from './AppIcon.jsx'
import { FolderPreview } from './FolderIcon.jsx'
import styles from './DragGhost.module.css'

const GHOST_HALF_PX = 30

// The lifted icon, drawn at the pointer in the phone's own coordinate space so it
// scales with the phone. It carries no data-item so it never counts as an icon.
export function DragGhost({ itemKey, position, folders }) {
  const { type, id } = parseItem(itemKey)
  const content =
    type === 'folder' && folders[id] !== undefined ? (
      <FolderPreview folder={folders[id]} />
    ) : (
      APPS[id] !== undefined && <AppTile app={APPS[id]} />
    )
  return (
    <div
      className={styles.ghost}
      style={{ transform: `translate(${position.x - GHOST_HALF_PX}px, ${position.y - GHOST_HALF_PX}px)` }}
      data-drag-ghost
      aria-hidden="true"
    >
      <div className={styles.lift}>{content}</div>
    </div>
  )
}
