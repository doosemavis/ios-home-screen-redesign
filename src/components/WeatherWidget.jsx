import { Glyph } from '../icons/Glyph.jsx'
import styles from './WeatherWidget.module.css'

// Static weather-style widget (a fixed, plausible forecast for a deterministic video).
export function WeatherWidget() {
  return (
    <div className={styles.wrap} data-widget="weather">
      <div className={styles.card}>
        <div className={styles.city}>
          Brooklyn
          <svg viewBox="0 0 10 10" className={styles.arrow} aria-hidden="true">
            <path d="M9 1L1 4.6l3.6.8.8 3.6z" />
          </svg>
        </div>
        <div className={styles.temp}>58°</div>
        <div className={styles.footer}>
          <Glyph name="cloud" className={styles.cloud} />
          <div className={styles.cond}>Partly Cloudy</div>
          <div className={styles.range}>H:63° L:49°</div>
        </div>
      </div>
      <span className={styles.label}>Weather</span>
    </div>
  )
}
