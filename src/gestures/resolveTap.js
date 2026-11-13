const SELECT_FOLDER_PREFIX = 'select:folder:'

export function parseSlot(value) {
  const parts = value.split(':')
  if (parts[0] === 'dock') return { area: 'dock', slot: Number(parts[1]) }
  return { area: 'page', page: Number(parts[1]), slot: Number(parts[2]) }
}

export function parseItem(key) {
  const [type, id] = key.split(':')
  return { type, id }
}

function itemAction(key) {
  const ref = parseItem(key)
  if (ref.type === 'folder') return { type: 'OPEN_FOLDER', folderId: ref.id }
  return { type: 'TOGGLE_SELECT', ref }
}

// Maps a pressed element to the reducer action a tap on it should cause, or null.
// Only edit mode reacts to taps; empty slots place the current selection.
export function resolveTap(target, { editMode, selection }) {
  if (!editMode || target === null || typeof target.closest !== 'function') return null
  const control = target.closest('[data-control]')
  const controlName = control === null ? '' : control.getAttribute('data-control')
  if (controlName.startsWith(SELECT_FOLDER_PREFIX)) {
    const id = controlName.slice(SELECT_FOLDER_PREFIX.length)
    return { type: 'TOGGLE_SELECT', ref: { type: 'folder', id } }
  }
  const slot = target.closest('[data-slot]')
  const item = target.closest('[data-item]') ?? (slot && slot.querySelector('[data-item]'))
  if (item) return itemAction(item.getAttribute('data-item'))
  if (slot === null || slot.querySelector('[data-widget]') !== null) return null
  if (selection.length === 0) return null
  return { type: 'PLACE_SELECTION', target: parseSlot(slot.getAttribute('data-slot')) }
}
