// What the toast says when the model refuses an action, keyed by the model's reason.
export const NO_ROOM_TEXT = 'Not enough room on this page'
export const DOCK_NO_ROOM_TEXT = 'Not enough room in the dock'
export const FALLBACK_TEXT = 'Can’t move there'

const TEXT_BY_REASON = {
  'folders-not-in-dock': 'Folders can’t go in the dock',
  'folders-cannot-nest': 'Folders can’t go inside folders',
  'slot-occupied': 'That spot is taken',
  'name-required': 'Give the folder a name',
}

// `target` (a page or dock location) only matters for "not enough room".
export function refusalText(reason, target) {
  if (reason === 'not-enough-space') return target?.area === 'dock' ? DOCK_NO_ROOM_TEXT : NO_ROOM_TEXT
  return TEXT_BY_REASON[reason] ?? FALLBACK_TEXT
}
