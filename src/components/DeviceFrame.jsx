import styles from './DeviceFrame.module.css'

// iPhone 15 Pro-style body: titanium band, side buttons, black bezel, screen with
// wallpaper, Dynamic Island, home indicator and a soft glass glare on top.
export function DeviceFrame({ children }) {
  return (
    <div className={styles.device} data-device="iphone">
      <span className={`${styles.button} ${styles.action}`} />
      <span className={`${styles.button} ${styles.volumeUp}`} />
      <span className={`${styles.button} ${styles.volumeDown}`} />
      <span className={`${styles.button} ${styles.power}`} />
      <div className={styles.bezel}>
        <div className={styles.screen}>
          {children}
          <div className={styles.island}>
            <span className={styles.lens} />
          </div>
          <div className={styles.homeIndicator} />
          <div className={styles.glare} />
        </div>
      </div>
    </div>
  )
}
