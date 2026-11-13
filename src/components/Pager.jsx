import { PAGE_COUNT } from '../model/constants.js'
import { PageGrid } from './PageGrid.jsx'
import styles from './Pager.module.css'

const TRACK_PRECISION = 4

// translateX percentage of the track (which is PAGE_COUNT screens wide).
const trackOffset = (page) => Number(((-page * 100) / PAGE_COUNT).toFixed(TRACK_PRECISION))

// All pages sit side by side on one track; page changes just slide the track.
// The transform lives on the track so item-level jiggle transforms stay untouched.
export function Pager({ pages, folders, page, editMode, selection }) {
  return (
    <div className={styles.pager}>
      <div
        className={styles.track}
        data-pager-track
        style={{ transform: `translateX(${trackOffset(page)}%)` }}
      >
        {pages.map((cells, index) => (
          <div key={index} className={styles.page}>
            <PageGrid
              pageIndex={index}
              cells={cells}
              folders={folders}
              editMode={editMode}
              selection={selection}
              active={index === page}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
