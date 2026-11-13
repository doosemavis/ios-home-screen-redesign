import { SelectedPill } from './SelectedPill.jsx'
import styles from './EditControls.module.css'

// Frosted Move + Snap stack and the "N selected" badge, shown while editing.
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
          disabled={snapDisabled}
          onClick={onSnap}
        >
          Snap
        </button>
      </div>
    </>
  )
}
