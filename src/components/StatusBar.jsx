import styles from './StatusBar.module.css'

// Apple's canonical demo time; fixed so every recording is identical.
const STATUS_TIME = '9:41'

function SignalIcon() {
  return (
    <svg viewBox="0 0 17 10" className={styles.signal} aria-hidden="true">
      <rect x="0" y="7" width="3" height="3" rx=".6" />
      <rect x="4.5" y="5" width="3" height="5" rx=".6" />
      <rect x="9" y="2.5" width="3" height="7.5" rx=".6" />
      <rect x="13.5" y="0" width="3" height="10" rx=".6" />
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 14 10" className={styles.wifi} aria-hidden="true">
      <path d="M7 2.2c2 0 3.8.8 5.1 2.1l1.1-1.1A8.8 8.8 0 007 .7 8.8 8.8 0 00.8 3.2l1.1 1.1A7.2 7.2 0 017 2.2zM7 5.2c1.2 0 2.2.5 3 1.2l1.1-1.1A5.8 5.8 0 007 3.7c-1.6 0-3 .6-4.1 1.6L4 6.4c.8-.7 1.8-1.2 3-1.2zM7 8.2c.5 0 .9.2 1.2.5L7 10 5.8 8.7c.3-.3.7-.5 1.2-.5z" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg viewBox="0 0 25 11" className={styles.battery} aria-hidden="true">
      <rect x=".5" y=".5" width="21" height="10" rx="3" className={styles.batteryShell} />
      <rect x="2" y="2" width="16" height="7" rx="1.6" />
      <path d="M23 3.8v3.4c.7-.3 1.2-1 1.2-1.7s-.5-1.4-1.2-1.7z" className={styles.batteryCap} />
    </svg>
  )
}

// In edit mode iOS swaps the status items for a Done button.
export function StatusBar({ editMode, onDone }) {
  if (editMode) {
    return (
      <div className={styles.bar}>
        <span className={styles.side} />
        <span className={styles.notch} />
        <span className={styles.side}>
          <button type="button" className={styles.done} data-control="done" onClick={onDone}>
            Done
          </button>
        </span>
      </div>
    )
  }
  return (
    <div className={styles.bar}>
      <span className={`${styles.side} ${styles.time}`}>{STATUS_TIME}</span>
      <span className={styles.notch} />
      <span className={`${styles.side} ${styles.icons}`}>
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </span>
    </div>
  )
}
