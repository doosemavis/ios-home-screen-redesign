import { Glyph } from '../icons/Glyph.jsx'
import styles from './PageIndicator.module.css'

// iOS shows a Search pill on the home screen and page dots while editing.
export function PageIndicator({ editMode, page, pageCount, onSelectPage }) {
  if (!editMode) {
    return (
      <div className={styles.search} data-control="search">
        <Glyph name="magnifier" className={styles.magnifier} />
        <span>Search</span>
      </div>
    )
  }
  return (
    <div className={styles.dots} data-control="page-dots">
      {Array.from({ length: pageCount }, (_, i) => (
        <button
          key={i}
          type="button"
          className={i === page ? `${styles.dot} ${styles.active}` : styles.dot}
          data-dot={i}
          aria-label={`Page ${i + 1} of ${pageCount}`}
          aria-current={i === page ? 'page' : undefined}
          onClick={() => onSelectPage?.(i)}
        />
      ))}
    </div>
  )
}
