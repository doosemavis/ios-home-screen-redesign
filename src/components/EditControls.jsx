import { SelectedPill } from './SelectedPill.jsx'
import styles from './EditControls.module.css'

// Frosted Move and Snap pills, side by side, and the centred "N selected" badge, shown
// while editing. The button says "Snap" to fit; its accessible name is the feature's full
// name, Snap to Grid.
export function EditControls({ selectedCount, snapDisabled, onMove, onSnap }) {
  return (
    <>
      <SelectedPill count={selectedCount} className={styles.badge} data-control="badge" />
      <div className={styles.stack}>
        <button
          type="button"
          className={styles.button}
          data-control="move"
          disabled={selectedCount === 0}
          onClick={onMove}
        >
          Move
        </button>
        <button
          type="button"
          className={styles.button}
          data-control="snap"
          aria-label="Snap to Grid"
          disabled={snapDisabled}
          onClick={onSnap}
        >
          Snap
        </button>
      </div>
    </>
  )
}
