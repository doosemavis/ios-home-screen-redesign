// Which mark a slot shows: the drag-hover glow wins; otherwise empty slots in edit
// mode show a placeholder that pulses while a selection waits to be placed.
export function slotMarkState({ empty, editMode, hasSelection, hovered }) {
  if (hovered) return 'hover'
  if (!empty || !editMode) return null
  return hasSelection ? 'ready' : 'idle'
}
