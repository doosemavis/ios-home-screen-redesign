import { PAGE_COUNT } from '../model/constants.js'
import { dropItem } from '../model/drop.js'
import { createFolder, moveOutOfFolder, moveToFolder } from '../model/folders.js'
import { findLocation, placeGroup } from '../model/layout.js'
import { isPageSnapped, snapPage } from '../model/snap.js'
import { refusalText } from './refusals.js'
import { toggleRef } from './selection.js'

export { NO_ROOM_TEXT } from './refusals.js'

export function initialState(layout) {
  return {
    layout,
    editMode: false,
    page: 0,
    selection: [],
    openFolderId: null,
    folderSelection: [],
    sheet: null,
    toast: null,
    shakeKey: 0,
    folderCounter: 1,
    toastCounter: 0,
  }
}

const shake = (state) => ({ ...state, shakeKey: state.shakeKey + 1 })

const showToast = (state, text) => ({
  ...shake(state),
  toast: { id: state.toastCounter + 1, text },
  toastCounter: state.toastCounter + 1,
})

// Every refusal shakes and says why; nothing in the layout changes.
const refuse = (state, reason, target) => showToast(state, refusalText(reason, target))

const slugify = (name) =>
  String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const onlyApps = (refs) => refs.every((r) => r.type === 'app')

const applied = (state, layout) => ({
  ...state,
  layout,
  selection: [],
  sheet: null,
})

function enterEdit(state) {
  return state.editMode ? state : { ...state, editMode: true }
}

function exitEdit(state) {
  const clean = !state.editMode && state.selection.length === 0
    && state.sheet === null && state.folderSelection.length === 0
    && state.openFolderId === null
  return clean ? state : { ...state, editMode: false, selection: [], sheet: null, folderSelection: [], openFolderId: null }
}

function toggleSelect(state, { ref }) {
  if (!state.editMode) return state
  return { ...state, selection: toggleRef(state.selection, ref) }
}

function goToPage(state, { page }) {
  if (!Number.isFinite(page)) return state
  const clamped = Math.min(Math.max(Math.trunc(page), 0), PAGE_COUNT - 1)
  return clamped === state.page ? state : { ...state, page: clamped }
}

function placeSelection(state, { target }) {
  if (state.selection.length === 0) return state
  const result = placeGroup(state.layout, state.selection, target)
  return result.ok ? applied(state, result.layout) : refuse(state, result.reason, target)
}

const isFromOpenFolder = (state, ref) =>
  ref?.type === 'app' && state.layout.folders[state.openFolderId]?.appIds.includes(ref.id) === true

// A drag out of the open folder that did not land (refused, released over nothing, or
// cancelled) leaves the folder open, so the pager returns to the page the folder is on.
function backToOpenFolder(state, ref) {
  if (!isFromOpenFolder(state, ref)) return state
  const where = findLocation(state.layout, { type: 'folder', id: state.openFolderId })
  if (where?.area !== 'page' || where.page === state.page) return state
  return { ...state, page: where.page }
}

// A successful drop of an app dragged out of the open folder closes that folder.
function drop(state, { ref, target }) {
  const result = dropItem(state.layout, ref, target)
  if (!result.ok) return backToOpenFolder(refuse(state, result.reason, target), ref)
  if (result.layout === state.layout) return state
  const fromFolder = findLocation(state.layout, ref)?.area === 'folder'
  const closed = fromFolder ? { openFolderId: null, folderSelection: [] } : {}
  return { ...state, layout: result.layout, ...closed }
}

function setSheet(sheet) {
  return (state) => {
    if (state.sheet === sheet) return state
    if (sheet !== null && !state.editMode) return state
    return { ...state, sheet }
  }
}

function moveSelectionToFolder(state, { folderId }) {
  if (state.selection.length === 0) return state
  if (!onlyApps(state.selection)) return refuse(state, 'folders-cannot-nest')
  const result = moveToFolder(state.layout, state.selection, folderId)
  return result.ok ? applied(state, result.layout) : refuse(state, result.reason)
}

function createFolderFromSelection(state, { name }) {
  if (state.selection.length === 0) return state
  if (!onlyApps(state.selection)) return refuse(state, 'folders-cannot-nest')
  const id = `folder-${slugify(name)}-${state.folderCounter}`
  const result = createFolder(state.layout, state.selection, { id, name, page: state.page })
  if (!result.ok) return refuse(state, result.reason)
  return { ...applied(state, result.layout), folderCounter: state.folderCounter + 1 }
}

function openFolder(state, { folderId }) {
  if (state.layout.folders[folderId] === undefined) return state
  if (state.openFolderId === folderId) return state
  return { ...state, openFolderId: folderId, folderSelection: [] }
}

function closeFolder(state) {
  if (state.openFolderId === null && state.folderSelection.length === 0) return state
  return { ...state, openFolderId: null, folderSelection: [] }
}

function toggleFolderSelect(state, { appId }) {
  const folder = state.layout.folders[state.openFolderId]
  if (folder === undefined || !folder.appIds.includes(appId)) return state
  const next = state.folderSelection.includes(appId)
    ? state.folderSelection.filter((id) => id !== appId)
    : [...state.folderSelection, appId]
  return { ...state, folderSelection: next }
}

function moveOut(state) {
  const { openFolderId, folderSelection } = state
  if (openFolderId === null || folderSelection.length === 0) return state
  const result = moveOutOfFolder(state.layout, openFolderId, folderSelection, state.page)
  if (!result.ok) return refuse(state, result.reason)
  const stillOpen = result.layout.folders[openFolderId] !== undefined
  return {
    ...state,
    layout: result.layout,
    folderSelection: [],
    openFolderId: stillOpen ? openFolderId : null,
  }
}

function snap(state) {
  if (isPageSnapped(state.layout, state.page)) return state
  return { ...state, layout: snapPage(state.layout, state.page) }
}

function dismissToast(state, { id }) {
  if (state.toast === null) return state
  if (id !== undefined && id !== state.toast.id) return state
  return { ...state, toast: null }
}

const handlers = {
  ENTER_EDIT: enterEdit,
  EXIT_EDIT: exitEdit,
  TOGGLE_SELECT: toggleSelect,
  GO_TO_PAGE: goToPage,
  PLACE_SELECTION: placeSelection,
  DROP: drop,
  DRAG_CANCELLED: (state, { ref }) => backToOpenFolder(state, ref),
  OPEN_SHEET: setSheet('move'),
  CLOSE_SHEET: setSheet(null),
  SHOW_NEW_FOLDER: setSheet('new-folder'),
  MOVE_SELECTION_TO_FOLDER: moveSelectionToFolder,
  CREATE_FOLDER: createFolderFromSelection,
  OPEN_FOLDER: openFolder,
  CLOSE_FOLDER: closeFolder,
  TOGGLE_FOLDER_SELECT: toggleFolderSelect,
  MOVE_OUT_OF_FOLDER: moveOut,
  SNAP_PAGE: snap,
  DISMISS_TOAST: dismissToast,
}

// A selected ref is only meaningful while it still sits on a page or in the dock.
const onHomeScreen = (layout, ref) => {
  const location = findLocation(layout, ref)
  return location !== null && location.area !== 'folder'
}

// Drops selection refs that a layout-changing action left pointing at nothing.
function reconcile(state) {
  const selection = state.selection.filter((ref) => onHomeScreen(state.layout, ref))
  const open = state.layout.folders[state.openFolderId]
  const folderSelection = open === undefined ? [] : state.folderSelection.filter((id) => open.appIds.includes(id))
  const openFolderId = open === undefined ? null : state.openFolderId
  const unchanged =
    selection.length === state.selection.length &&
    folderSelection.length === state.folderSelection.length &&
    openFolderId === state.openFolderId
  return unchanged ? state : { ...state, selection, folderSelection, openFolderId }
}

export function homeScreenReducer(state, action) {
  const handler = handlers[action.type]
  if (handler === undefined) return state
  const next = handler(state, action)
  return next.layout === state.layout ? next : reconcile(next)
}
