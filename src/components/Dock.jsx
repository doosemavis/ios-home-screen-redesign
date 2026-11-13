import { CellItem } from './CellItem.jsx'
import styles from './Dock.module.css'

// Frosted dock; dock apps carry no labels, as on iOS.
export function Dock({ cells, folders, editMode, selection }) {
  return (
    <div className={styles.dock}>
      {cells.map((cell, slot) => (
        <div key={slot} className={styles.slot} data-slot={`dock:${slot}`}>
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
