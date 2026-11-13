import { GRID_COLUMNS } from '../model/constants.js'
import { CellItem } from './CellItem.jsx'
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

function Slot({ pageIndex, slot, span = 1, className, children }) {
  return (
    <div
      className={className ?? styles.slot}
      style={gridPlacement(slot, span)}
      data-slot={`page:${pageIndex}:${slot}`}
    >
      {children}
    </div>
  )
}

// One 4×6 page. Slots covered by the widget (but not its anchor) render nothing.
export function PageGrid({ pageIndex, cells, folders, editMode, selection }) {
  return (
    <div className={styles.grid} data-page={pageIndex}>
      {cells.map((cell, slot) => {
        if (isWidget(cell)) {
          if (!cell.anchor) return null
          return (
            <Slot key={slot} pageIndex={pageIndex} slot={slot} span={WIDGET_SPAN} className={styles.widgetSlot}>
              <WeatherWidget />
            </Slot>
          )
        }
        return (
          <Slot key={slot} pageIndex={pageIndex} slot={slot}>
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
