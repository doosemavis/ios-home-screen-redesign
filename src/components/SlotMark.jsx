import styles from './SlotMark.module.css'

const STATE_CLASS = { idle: styles.idle, ready: `${styles.ready} ${styles.pulse}`, hover: styles.hover }

// One icon-sized squircle per slot, laid exactly over where an icon tile sits: the
// "you can place here" placeholder and the drop glow are the same element, so their
// sizes always match. It lives inside the slot (so a tap on it is a tap on the slot)
// and carries no data-item.
export function SlotMark({ state }) {
  if (state === null) return null
  return (
    <span
      className={`${styles.mark} ${STATE_CLASS[state]}`}
      data-slot-mark={state}
      data-drop-target={state === 'hover' ? 'true' : undefined}
      aria-hidden="true"
    />
  )
}
