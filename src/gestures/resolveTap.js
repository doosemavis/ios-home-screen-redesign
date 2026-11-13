const SELECT_FOLDER_PREFIX = 'select:folder:'

// Anything a tap can mean something on; the rest of the screen is wallpaper.
const NOT_WALLPAPER = '[data-slot], [data-item], [data-control], [data-widget], [data-dock], [role="dialog"]'
const EXIT_EDIT = { type: 'EXIT_EDIT' }

export function parseSlot(value) {
  const parts = value.split(':')
  if (parts[0] === 'dock') return { area: 'dock', slot: Number(parts[1]) }
  return { area: 'page', page: Number(parts[1]), slot: Number(parts[2]) }
}

export function parseItem(key) {
  const [type, id] = key.split(':')
  return { type, id }
}

const itemUnder = (target, slot) => target.closest('[data-item]') ?? (slot && slot.querySelector('[data-item]'))

function itemAction(key) {
  const ref = parseItem(key)
  if (ref.type === 'folder') return { type: 'OPEN_FOLDER', folderId: ref.id }
  return { type: 'TOGGLE_SELECT', ref }
}

// Outside edit mode only folders react: a tap opens them.
function browseTap(target) {
  const item = itemUnder(target, target.closest('[data-slot]'))
  const ref = item === null ? null : parseItem(item.getAttribute('data-item'))
  return ref !== null && ref.type === 'folder' ? { type: 'OPEN_FOLDER', folderId: ref.id } : null
}

// Maps a pressed element to the reducer action a tap on it should cause, or null.
// Outside edit mode a tap opens a folder. In edit mode items toggle, empty slots
// place the current selection, and bare wallpaper exits when nothing is selected.
export function resolveTap(target, { editMode, selection }) {
  if (target === null || typeof target.closest !== 'function') return null
  if (!editMode) return browseTap(target)
  const control = target.closest('[data-control]')
  const controlName = control === null ? '' : control.getAttribute('data-control')
  if (controlName.startsWith(SELECT_FOLDER_PREFIX)) {
    const id = controlName.slice(SELECT_FOLDER_PREFIX.length)
    return { type: 'TOGGLE_SELECT', ref: { type: 'folder', id } }
  }
  const slot = target.closest('[data-slot]')
  const item = itemUnder(target, slot)
  if (item) return itemAction(item.getAttribute('data-item'))
  if (selection.length > 0 && slot !== null && slot.querySelector('[data-widget]') === null) {
    return { type: 'PLACE_SELECTION', target: parseSlot(slot.getAttribute('data-slot')) }
  }
  const wallpaper = target.closest(NOT_WALLPAPER) === null
  return wallpaper && selection.length === 0 ? EXIT_EDIT : null
}
