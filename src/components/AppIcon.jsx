import { Glyph } from '../icons/Glyph.jsx'
import { glyphInk } from '../icons/ink.js'
import styles from './AppIcon.module.css'

const JIGGLE_STEP_S = 0.05
const JIGGLE_PHASES = 7

const cx = (...names) => names.filter(Boolean).join(' ')

function SelectBadge({ selected }) {
  return (
    <span className={cx(styles.badge, selected && styles.badgeOn)} aria-hidden="true">
      {selected && (
        <svg viewBox="0 0 12 12" className={styles.check}>
          <path d="M3 6.2l2 2L9 4" />
        </svg>
      )}
    </span>
  )
}

// Shared wrapper for anything that sits in a slot: carries the data-item hook,
// the jiggle, the edit-mode selection badge and the label.
export function ItemShell({ itemKey, label, editMode, selected, jiggleIndex = 0, showLabel = true, children }) {
  const phase = jiggleIndex % JIGGLE_PHASES
  const jiggleVars = editMode ? { '--jiggle-delay': `${-phase * JIGGLE_STEP_S}s` } : undefined
  return (
    <div
      className={cx(styles.item, editMode && styles.jiggle, jiggleIndex % 2 === 1 && styles.jiggleAlt)}
      style={jiggleVars}
      data-item={itemKey}
      data-selected={String(selected)}
    >
      <div className={cx(styles.tileWrap, selected && styles.tileSelected)}>
        {children}
        {editMode && <SelectBadge selected={selected} />}
      </div>
      {showLabel && <span className={styles.label}>{label}</span>}
    </div>
  )
}

export function AppTile({ app, className }) {
  const [top, bottom] = app.gradient
  const ink = glyphInk(app.gradient)
  return (
    <div
      className={cx(styles.tile, ink === 'dark' && styles.inkDark, className)}
      style={{ '--top': top, '--bottom': bottom }}
    >
      <Glyph name={app.glyph} className={styles.glyph} />
    </div>
  )
}

export function AppIcon({ app, editMode, selected, jiggleIndex, showLabel }) {
  return (
    <ItemShell
      itemKey={`app:${app.id}`}
      label={app.name}
      editMode={editMode}
      selected={selected}
      jiggleIndex={jiggleIndex}
      showLabel={showLabel}
    >
      <AppTile app={app} />
    </ItemShell>
  )
}
