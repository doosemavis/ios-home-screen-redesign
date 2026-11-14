import { useFitScale } from '../useFitScale.js'
import { HEADLINE } from './copy.js'
import styles from './Stage.module.css'

// Fixed 540×675 (4:5) frame for the recorder: headline, phone, caption. The video
// ends by fading the whole frame to white.
function RecordStage({ caption, fadeOut, children }) {
  return (
    <div className={`${styles.stage} ${styles.record}`} data-stage="record">
      <h1 className={styles.headline}>{HEADLINE}</h1>
      <div className={styles.recordPhone}>{children}</div>
      <p className={styles.caption} key={caption ?? ''} data-caption>
        {caption}
      </p>
      {fadeOut && <div className={styles.fadeOut} data-fade-out />}
    </div>
  )
}

// Full-viewport light stage for interactive use; the phone scales to fit.
function HandStage({ children }) {
  const scale = useFitScale()
  return (
    <div className={`${styles.stage} ${styles.hand}`} data-stage="hand">
      <div style={{ zoom: scale }}>{children}</div>
    </div>
  )
}

export function Stage({ mode = 'hand', caption = null, fadeOut = false, children }) {
  if (mode === 'record') {
    return (
      <RecordStage caption={caption} fadeOut={fadeOut}>
        {children}
      </RecordStage>
    )
  }
  return <HandStage>{children}</HandStage>
}
