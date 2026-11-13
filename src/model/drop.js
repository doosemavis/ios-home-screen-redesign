import { DOCK_SLOTS, PAGE_COUNT, SLOTS_PER_PAGE } from './constants.js'
import { moveToFolder } from './folders.js'
import { findLocation, getCell, hasValidRefs, inRange, placeGroup, setCell } from './layout.js'

const invalidTarget = { ok: false, reason: 'invalid-target' }

function inBounds(target) {
  if (target.area === 'page') return inRange(target.page, PAGE_COUNT) && inRange(target.slot, SLOTS_PER_PAGE)
  return target.area === 'dock' && inRange(target.slot, DOCK_SLOTS)
}

const sameLocation = (a, b) =>
  a.area === b.area && a.slot === b.slot && (a.area === 'dock' || a.page === b.page)

function swap(layout, source, target, ref, occupant) {
  const moved = setCell(layout, target, { type: ref.type, id: ref.id })
  return { ok: true, layout: setCell(moved, source, occupant) }
}

function dropOnOccupied(layout, ref, source, target, occupant) {
  if (occupant.type === 'widget' || source.area === 'folder') return invalidTarget
  if (ref.type === 'folder' && target.area === 'dock') return invalidTarget
  if (ref.type === 'app' && occupant.type === 'folder') {
    return moveToFolder(layout, [ref], occupant.id)
  }
  return swap(layout, source, target, ref, occupant)
}

export function dropItem(layout, ref, target) {
  if (!hasValidRefs(layout, [ref])) return { ok: false, reason: 'invalid-refs' }
  if (!inBounds(target)) return invalidTarget
  const source = findLocation(layout, ref)
  if (sameLocation(source, target)) return { ok: true, layout }
  const occupant = getCell(layout, target)
  if (occupant === null) return placeGroup(layout, [ref], target)
  return dropOnOccupied(layout, ref, source, target, occupant)
}
