import { GRID_COLUMNS } from '../model/constants.js'
import { CellItem } from './CellItem.jsx'
import { useDragView } from './DragContext.js'
import { SlotMark } from './SlotMark.jsx'
import { emptySlotProps, slotMarkState } from './slotMarkState.js'
import { WeatherWidget } from './WeatherWidget.jsx'
import styles from './PageGrid.module.css'

const WIDGET_SPAN = 2

const isWidget = (cell) => cell !== null && cell.type === 'widget'

function gridPlacement(slot, span) {
  return {
    '--col': (slot % GRID_COLUMNS) + 1,
    '--row': Math.floor(slot / GRID_COLUMNS) + 1,
    '--span': span,
  }
}

// One grid cell. Its mark (placeholder or drop glow) is icon-sized, never the cell.
function Slot({ pageIndex, slot, span = 1, className, marks, empty = false, children }) {
  const name = `page:${pageIndex}:${slot}`
  const hovered = useDragView().hoverTarget === name
  const label = `Empty slot ${slot + 1}, page ${pageIndex + 1}`
  return (
    <div
      className={className ?? styles.slot}
      style={gridPlacement(slot, span)}
      data-slot={name}
      {...emptySlotProps({ empty, editMode: marks.editMode, label })}
    >
      {children}
      <SlotMark state={slotMarkState({ ...marks, empty, hovered })} />
    </div>
  )
}

// One 4×6 page. Slots covered by the widget (but not its anchor) render nothing.
export function PageGrid({ pageIndex, cells, folders, editMode, selection, active = true }) {
  const marks = { editMode, hasSelection: selection.length > 0 }
  return (
    <div className={styles.grid} data-page={pageIndex} aria-hidden={active ? undefined : true} inert={!active}>
      {cells.map((cell, slot) => {
        if (isWidget(cell)) {
          if (!cell.anchor) return null
          return (
            <Slot key={slot} pageIndex={pageIndex} slot={slot} span={WIDGET_SPAN} className={styles.widgetSlot} marks={marks}>
              <WeatherWidget />
            </Slot>
          )
        }
        return (
          <Slot key={slot} pageIndex={pageIndex} slot={slot} marks={marks} empty={cell === null}>
            {cell !== null && (
              <CellItem
                cell={cell}
                folders={folders}
                editMode={editMode}
                selection={selection}
                jiggleIndex={slot}
              />
            )}
          </Slot>
        )
      })}
    </div>
  )
}
