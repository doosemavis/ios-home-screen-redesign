import styles from './SelectedPill.module.css'

// The blue "N selected" pill shared by the home screen and the folder overlay.
// Callers place it (className) and give it its data hook.
export function SelectedPill({ count, className, ...hooks }) {
  if (count <= 0) return null
  return (
    <div className={className === undefined ? styles.pill : `${styles.pill} ${className}`} role="status" {...hooks}>
      {`${count} selected`}
    </div>
  )
}
