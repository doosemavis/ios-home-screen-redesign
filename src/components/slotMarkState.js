// Which mark a slot shows: the drag-hover glow wins; otherwise empty slots in edit
// mode show a placeholder that pulses while a selection waits to be placed.
export function slotMarkState({ empty, editMode, hasSelection, hovered }) {
  if (hovered) return 'hover'
  if (!empty || !editMode) return null
  return hasSelection ? 'ready' : 'idle'
}

// In edit mode an empty slot is a button keyboard users can focus and press (Enter or
// Space places the selection there, like a tap); otherwise it is plain layout.
export function emptySlotProps({ empty, editMode, label }) {
  return empty && editMode ? { role: 'button', tabIndex: 0, 'aria-label': label } : {}
}
