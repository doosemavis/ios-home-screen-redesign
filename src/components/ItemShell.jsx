import styles from './AppIcon.module.css'

const JIGGLE_STEP_S = 0.05
const JIGGLE_PHASES = 7

const cx = (...names) => names.filter(Boolean).join(' ')

function SelectBadge({ selected, control, label }) {
  const mark = selected && (
    <svg viewBox="0 0 12 12" className={styles.check}>
      <path d="M3 6.2l2 2L9 4" />
    </svg>
  )
  if (control === undefined) {
    return (
      <span className={cx(styles.badge, selected && styles.badgeOn)} aria-hidden="true">
        {mark}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={cx(styles.badge, styles.badgeButton, selected && styles.badgeOn)}
      data-control={control}
      aria-label={`Select ${label}`}
      aria-pressed={selected}
    >
      {mark}
    </button>
  )
}

// Shared wrapper for anything that sits in a slot: carries the data-item hook,
// the jiggle, the edit-mode selection badge and the label. `interactive` makes
// the whole item a button (apps); folders put the button role on their body so
// the select circle is not nested inside another control.
export function ItemShell({
  itemKey,
  label,
  editMode,
  selected,
  jiggleIndex = 0,
  showLabel = true,
  interactive = true,
  selectControl,
  children,
}) {
  const phase = jiggleIndex % JIGGLE_PHASES
  const jiggleVars = editMode ? { '--jiggle-delay': `${-phase * JIGGLE_STEP_S}s` } : undefined
  const buttonProps = interactive
    ? {
        role: 'button',
        tabIndex: editMode ? 0 : -1,
        'aria-label': label,
        'aria-pressed': editMode ? selected : undefined,
      }
    : {}
  return (
    <div
      className={cx(styles.item, editMode && styles.jiggle, jiggleIndex % 2 === 1 && styles.jiggleAlt)}
      style={jiggleVars}
      data-item={itemKey}
      data-selected={String(selected)}
      {...buttonProps}
    >
      <div className={cx(styles.tileWrap, selected && styles.tileSelected)}>
        {children}
        {editMode && <SelectBadge selected={selected} control={selectControl} label={label} />}
      </div>
      {showLabel && <span className={styles.label}>{label}</span>}
    </div>
  )
}
