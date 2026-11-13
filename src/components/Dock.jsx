import { CellItem } from './CellItem.jsx'
import { useDragView } from './DragContext.js'
import styles from './Dock.module.css'

// Frosted dock; dock apps carry no labels, as on iOS.
export function Dock({ cells, folders, editMode, selection }) {
  const { hoverTarget } = useDragView()
  return (
    <div className={styles.dock}>
      {cells.map((cell, slot) => (
        <div
          key={slot}
          className={hoverTarget === `dock:${slot}` ? `${styles.slot} ${styles.dropTarget}` : styles.slot}
          data-slot={`dock:${slot}`}
          data-drop-target={hoverTarget === `dock:${slot}` ? 'true' : undefined}
        >
          {cell !== null && (
            <CellItem
              cell={cell}
              folders={folders}
              editMode={editMode}
              selection={selection}
              jiggleIndex={slot + 3}
              showLabel={false}
            />
          )}
        </div>
      ))}
    </div>
  )
}
