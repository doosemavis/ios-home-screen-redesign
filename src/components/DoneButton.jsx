import styles from './StatusBar.module.css'

// Status-bar Done button shown while editing.
export function DoneButton({ onDone }) {
  return (
    <button type="button" className={styles.done} data-control="done" onClick={onDone}>
      Done
    </button>
  )
}
