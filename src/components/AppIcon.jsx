import { Glyph } from '../icons/Glyph.jsx'
import { glyphInk } from '../icons/ink.js'
import { ItemShell } from './ItemShell.jsx'
import styles from './AppIcon.module.css'

const cx = (...names) => names.filter(Boolean).join(' ')

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
