import { DOCK_SLOTS, PAGE_COUNT, SLOTS_PER_PAGE } from './constants.js'

const sameRef = (cell, ref) =>
  cell !== null && cell.type === ref.type && cell.id === ref.id

export function getCell(layout, location) {
  if (location.area === 'page') return layout.pages[location.page]?.[location.slot] ?? null
  if (location.area === 'dock') return layout.dock[location.slot] ?? null
  return null
}

export function findLocation(layout, ref) {
  for (let page = 0; page < layout.pages.length; page += 1) {
    const slot = layout.pages[page].findIndex((c) => sameRef(c, ref))
    if (slot >= 0) return { area: 'page', page, slot }
  }
  const dockSlot = layout.dock.findIndex((c) => sameRef(c, ref))
  if (dockSlot >= 0) return { area: 'dock', slot: dockSlot }
  if (ref.type !== 'app') return null
  const folderId = Object.keys(layout.folders).find((id) =>
    layout.folders[id].appIds.includes(ref.id),
  )
  return folderId === undefined ? null : { area: 'folder', folderId }
}

const clearMatching = (cells, refs) =>
  cells.map((c) => (refs.some((r) => sameRef(c, r)) ? null : c))

export function removeRefs(layout, refs) {
  const appIds = new Set(refs.filter((r) => r.type === 'app').map((r) => r.id))
  return {
    ...layout,
    pages: layout.pages.map((p) => clearMatching(p, refs)),
    dock: clearMatching(layout.dock, refs),
    folders: Object.fromEntries(
      Object.entries(layout.folders).map(([id, f]) => [
        id,
        { ...f, appIds: f.appIds.filter((a) => !appIds.has(a)) },
      ]),
    ),
  }
}

const replaceAt = (list, index, value) =>
  list.map((c, i) => (i === index ? value : c))

export function setCell(layout, location, cell) {
  if (location.area === 'page') {
    return {
      ...layout,
      pages: layout.pages.map((p, i) =>
        i === location.page ? replaceAt(p, location.slot, cell) : p,
      ),
    }
  }
  if (location.area === 'dock') {
    return { ...layout, dock: replaceAt(layout.dock, location.slot, cell) }
  }
  return layout
}

const inRange = (n, max) => Number.isInteger(n) && n >= 0 && n < max

function isValidTarget(layout, refs, target) {
  if (target.area === 'page') {
    if (!inRange(target.page, PAGE_COUNT) || !inRange(target.slot, SLOTS_PER_PAGE)) {
      return false
    }
  } else if (target.area === 'dock') {
    if (!inRange(target.slot, DOCK_SLOTS)) return false
    if (refs.some((r) => r.type !== 'app')) return false
  } else {
    return false
  }
  return getCell(layout, target) === null
}

function sequenceOf(target) {
  const size = target.area === 'page' ? SLOTS_PER_PAGE : DOCK_SLOTS
  return Array.from({ length: size - target.slot }, (_, i) => target.slot + i)
}

function emptySlotsFrom(layout, target, count) {
  const asLocation = (slot) => ({ ...target, slot })
  return sequenceOf(target)
    .filter((slot) => getCell(layout, asLocation(slot)) === null)
    .slice(0, count)
    .map(asLocation)
}

export function hasValidRefs(layout, refs) {
  if (refs.length === 0) return false
  const keys = refs.map((r) => `${r.type}:${r.id}`)
  if (new Set(keys).size !== keys.length) return false
  return refs.every((r) => r.type !== 'widget' && findLocation(layout, r) !== null)
}

export function placeGroup(layout, refs, target) {
  if (!hasValidRefs(layout, refs)) return { ok: false, reason: 'invalid-refs' }
  if (!isValidTarget(layout, refs, target)) return { ok: false, reason: 'invalid-target' }
  const cleared = removeRefs(layout, refs)
  const slots = emptySlotsFrom(cleared, target, refs.length)
  if (slots.length < refs.length) return { ok: false, reason: 'not-enough-space' }
  const placed = slots.reduce(
    (acc, loc, i) =>
      setCell(acc, loc, { type: refs[i].type, id: refs[i].id }),
    cleared,
  )
  return { ok: true, layout: placed }
}
