import { SLOTS_PER_PAGE } from './constants.js'
import {
  findLocation, getCell, hasValidRefs, pruneEmptyFolders, removeRefs, setCell, sourceFolderIds,
} from './layout.js'

const isApp = (r) => r.type === 'app'
const inPageRange = (page, layout) => Number.isInteger(page) && page >= 0 && page < layout.pages.length
const fail = (reason) => ({ ok: false, reason })

function withAppendedApps(layout, folderId, appIds) {
  const target = layout.folders[folderId]
  return {
    ...layout,
    folders: { ...layout.folders, [folderId]: { ...target, appIds: [...target.appIds, ...appIds] } },
  }
}

export function moveToFolder(layout, refs, folderId) {
  if (refs.some((r) => r.type === 'folder')) return fail('folders-cannot-nest')
  if (!hasValidRefs(layout, refs)) return fail('invalid-refs')
  if (layout.folders[folderId] === undefined) return fail('invalid-target')
  const sources = sourceFolderIds(layout, refs)
  const moved = withAppendedApps(removeRefs(layout, refs), folderId, refs.map((r) => r.id))
  return { ok: true, layout: pruneEmptyFolders(moved, sources.filter((id) => id !== folderId)) }
}

// The folder holding `appId` and its index there (appended in selection order), or null.
export function folderOfApp(layout, appId) {
  const folder = Object.values(layout.folders).find((f) => f.appIds.includes(appId))
  return folder === undefined ? null : { folderId: folder.id, index: folder.appIds.indexOf(appId) }
}

function folderSlot(layout, cleared, firstRef, page) {
  const where = findLocation(layout, firstRef)
  if (where?.area === 'page' && where.page === page) return where.slot
  return cleared.pages[page].findIndex((c) => c === null)
}

function validateCreate(layout, refs, { id, name, page }) {
  if (refs.some((r) => r.type === 'folder')) return 'folders-cannot-nest'
  if (typeof name !== 'string' || name.trim() === '') return 'name-required'
  if (!hasValidRefs(layout, refs) || !refs.every(isApp)) return 'invalid-refs'
  if (layout.folders[id] !== undefined) return 'duplicate-id'
  return inPageRange(page, layout) ? null : 'invalid-target'
}

export function createFolder(layout, appRefs, options) {
  const problem = validateCreate(layout, appRefs, options)
  if (problem !== null) return fail(problem)
  const { id, name, page } = options
  const sources = sourceFolderIds(layout, appRefs)
  const cleared = pruneEmptyFolders(removeRefs(layout, appRefs), sources)
  const target = { area: 'page', page, slot: folderSlot(layout, cleared, appRefs[0], page) }
  if (target.slot < 0) return fail('not-enough-space')
  const created = {
    ...setCell(cleared, target, { type: 'folder', id }),
    folders: { ...cleared.folders, [id]: { id, name: name.trim(), appIds: appRefs.map((r) => r.id) } },
  }
  return { ok: true, layout: created }
}

function validMoveOut(layout, folderId, appIds, page) {
  const folder = layout.folders[folderId]
  if (folder === undefined || !inPageRange(page, layout)) return 'invalid-target'
  const unique = new Set(appIds)
  const belongs = appIds.every((a) => folder.appIds.includes(a))
  return appIds.length > 0 && unique.size === appIds.length && belongs ? null : 'invalid-refs'
}

function firstEmptySlots(layout, page, count) {
  return Array.from({ length: SLOTS_PER_PAGE }, (_, slot) => slot)
    .filter((slot) => getCell(layout, { area: 'page', page, slot }) === null)
    .slice(0, count)
}

export function moveOutOfFolder(layout, folderId, appIds, page) {
  const problem = validMoveOut(layout, folderId, appIds, page)
  if (problem !== null) return fail(problem)
  const remaining = layout.folders[folderId].appIds.filter((a) => !appIds.includes(a))
  const shrunk = {
    ...layout,
    folders: { ...layout.folders, [folderId]: { ...layout.folders[folderId], appIds: remaining } },
  }
  const pruned = pruneEmptyFolders(shrunk, [folderId])
  const slots = firstEmptySlots(pruned, page, appIds.length)
  if (slots.length < appIds.length) return fail('not-enough-space')
  const placed = slots.reduce(
    (acc, slot, i) => setCell(acc, { area: 'page', page, slot }, { type: 'app', id: appIds[i] }),
    pruned,
  )
  return { ok: true, layout: placed }
}
