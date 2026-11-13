import { useFitScale } from '../useFitScale.js'
import { HEADLINE, REPO_URL, TAKEAWAY } from './copy.js'
import styles from './Stage.module.css'

function EndCard() {
  return (
    <div className={styles.endCard} data-end-card="visible">
      <p className={styles.takeaway}>{TAKEAWAY}</p>
      <p className={styles.repo}>{REPO_URL}</p>
    </div>
  )
}

// Fixed 540×675 (4:5) frame for the recorder: headline, phone, caption.
function RecordStage({ caption, showEndCard, children }) {
  return (
    <div className={`${styles.stage} ${styles.record}`} data-stage="record">
      <h1 className={styles.headline}>{HEADLINE}</h1>
      <div className={styles.recordPhone}>{children}</div>
      <p className={styles.caption} key={caption ?? ''} data-caption>
        {caption}
      </p>
      {showEndCard && <EndCard />}
    </div>
  )
}

// Full-viewport light stage for interactive use; the phone scales to fit.
function HandStage({ showEndCard, children }) {
  const scale = useFitScale()
  return (
    <div className={`${styles.stage} ${styles.hand}`} data-stage="hand">
      <div style={{ zoom: scale }}>{children}</div>
      {showEndCard && <EndCard />}
    </div>
  )
}

export function Stage({ mode = 'hand', caption = null, showEndCard = false, children }) {
  if (mode === 'record') {
    return (
      <RecordStage caption={caption} showEndCard={showEndCard}>
        {children}
      </RecordStage>
    )
  }
  return <HandStage showEndCard={showEndCard}>{children}</HandStage>
}
