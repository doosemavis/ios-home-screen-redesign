import { CellItem } from './CellItem.jsx'
import { useDragView } from './DragContext.js'
import { SlotMark } from './SlotMark.jsx'
import { slotMarkState } from './slotMarkState.js'
import styles from './Dock.module.css'

// Frosted dock; dock apps carry no labels, as on iOS. Each slot carries the same
// icon-sized mark (placeholder or drop glow) as a page slot.
export function Dock({ cells, folders, editMode, selection }) {
  const { hoverTarget } = useDragView()
  const hasSelection = selection.length > 0
  return (
    <div className={styles.dock} data-dock>
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
          <SlotMark
            state={slotMarkState({ empty: cell === null, editMode, hasSelection, hovered: hoverTarget === `dock:${slot}` })}
          />
        </div>
      ))}
    </div>
  )
}
