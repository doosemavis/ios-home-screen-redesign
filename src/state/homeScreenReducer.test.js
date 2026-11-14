import { describe, it, expect } from 'vitest'
import { homeScreenReducer, initialState } from './homeScreenReducer.js'
import { createInitialLayout } from '../model/initialLayout.js'
import { PAGE_COUNT } from '../model/constants.js'
import { findLocation } from '../model/layout.js'
import { deepFreeze } from '../test/deepFreeze.js'

const app = (id) => ({ type: 'app', id })
const folder = (id) => ({ type: 'folder', id })
const page = (p, slot) => ({ area: 'page', page: p, slot })

const fresh = () => deepFreeze(initialState(createInitialLayout()))
const run = (state, ...actions) => actions.reduce(homeScreenReducer, state)
const editing = (extra = {}) => deepFreeze({ ...run(initialState(createInitialLayout()), { type: 'ENTER_EDIT' }), ...extra })
const selecting = (...refs) => run(editing(), ...refs.map((ref) => ({ type: 'TOGGLE_SELECT', ref })))

describe('initialState', () => {
  it('has the documented shape', () => {
    const layout = createInitialLayout()
    expect(initialState(layout)).toEqual({
      layout, editMode: false, page: 0, selection: [], openFolderId: null,
      folderSelection: [], sheet: null, toast: null, shakeKey: 0,
      folderCounter: 1, toastCounter: 0,
    })
  })
})

describe('edit mode and selection', () => {
  it('ENTER_EDIT enters edit mode', () => {
    expect(run(fresh(), { type: 'ENTER_EDIT' }).editMode).toBe(true)
  })
  it('ENTER_EDIT is a no-op when already editing', () => {
    const state = editing()
    expect(homeScreenReducer(state, { type: 'ENTER_EDIT' })).toBe(state)
  })
  it('EXIT_EDIT clears selection, sheet and folder selection', () => {
    const state = deepFreeze({ ...selecting(app('maps')), sheet: 'move', folderSelection: ['x'] })
    const next = homeScreenReducer(state, { type: 'EXIT_EDIT' })
    expect(next).toMatchObject({ editMode: false, selection: [], sheet: null, folderSelection: [] })
  })
  it('EXIT_EDIT closes an open folder overlay', () => {
    const state = deepFreeze({ ...editing(), openFolderId: 'social', folderSelection: ['chat'] })
    const next = homeScreenReducer(state, { type: 'EXIT_EDIT' })
    expect(next).toMatchObject({ openFolderId: null, folderSelection: [] })
  })
  it('EXIT_EDIT outside edit mode with nothing to clear is a no-op', () => {
    const state = fresh()
    expect(homeScreenReducer(state, { type: 'EXIT_EDIT' })).toBe(state)
  })
  it('TOGGLE_SELECT adds and removes refs in order', () => {
    const state = selecting(app('maps'), app('notes'))
    expect(state.selection).toEqual([app('maps'), app('notes')])
    expect(run(state, { type: 'TOGGLE_SELECT', ref: app('maps') }).selection).toEqual([app('notes')])
  })
  it('TOGGLE_SELECT ignored when not in edit mode', () => {
    const state = fresh()
    expect(homeScreenReducer(state, { type: 'TOGGLE_SELECT', ref: app('maps') })).toBe(state)
  })
})

describe('GO_TO_PAGE', () => {
  it('goes to a page', () => {
    expect(run(fresh(), { type: 'GO_TO_PAGE', page: 1 }).page).toBe(1)
  })
  it('clamps to 0..PAGE_COUNT-1', () => {
    expect(run(fresh(), { type: 'GO_TO_PAGE', page: 99 }).page).toBe(PAGE_COUNT - 1)
    expect(run(fresh(), { type: 'GO_TO_PAGE', page: -4 }).page).toBe(0)
  })
  it('is a no-op for the current page or a non-number', () => {
    const state = fresh()
    expect(homeScreenReducer(state, { type: 'GO_TO_PAGE', page: 0 })).toBe(state)
    expect(homeScreenReducer(state, { type: 'GO_TO_PAGE', page: Number.NaN })).toBe(state)
  })
})

describe('PLACE_SELECTION', () => {
  it('places the selection, clears it and closes the sheet', () => {
    const state = deepFreeze({ ...selecting(app('maps'), app('notes')), page: 2, sheet: 'move' })
    const next = homeScreenReducer(state, { type: 'PLACE_SELECTION', target: page(2, 10) })
    expect(findLocation(next.layout, app('maps'))).toEqual(page(2, 10))
    expect(findLocation(next.layout, app('notes'))).toEqual(page(2, 11))
    expect(next.selection).toEqual([])
    expect(next.sheet).toBeNull()
  })
  it('PLACE_SELECTION refusal sets toast and increments shakeKey', () => {
    const state = selecting(app('files'), app('tv'))
    const next = homeScreenReducer(state, { type: 'PLACE_SELECTION', target: page(2, 23) })
    expect(next.layout).toBe(state.layout)
    expect(next.toast).toEqual({ id: 1, text: 'Not enough room on this page' })
    expect(next.shakeKey).toBe(state.shakeKey + 1)
    expect(next.selection).toEqual(state.selection)
  })
  it('refusals produce distinct toast ids', () => {
    const state = selecting(app('files'))
    const action = { type: 'PLACE_SELECTION', target: page(0, 0) }
    expect(run(state, action, action).toast.id).toBe(2)
  })
  it('PLACE_SELECTION refusals say why: folders in the dock, a full dock', () => {
    const dock = (slot) => ({ area: 'dock', slot })
    const emptyDock = (state) => deepFreeze({ ...state, layout: { ...state.layout, dock: [null, null, null, app('music')] } })
    const withFolder = emptyDock(selecting(app('maps'), folder('media')))
    expect(run(withFolder, { type: 'PLACE_SELECTION', target: dock(0) }).toast.text).toBe('Folders can’t go in the dock')
    const three = emptyDock(selecting(app('maps'), app('notes'), app('calendar')))
    expect(run(three, { type: 'PLACE_SELECTION', target: dock(1) }).toast.text).toBe('Not enough room in the dock')
  })
  it('second PLACE_SELECTION with empty selection is a no-op', () => {
    const state = deepFreeze(selecting(app('maps')))
    const action = { type: 'PLACE_SELECTION', target: page(2, 10) }
    const once = homeScreenReducer(state, action)
    expect(homeScreenReducer(once, action)).toBe(once)
  })
})

describe('DROP', () => {
  it('applies a valid drop', () => {
    const next = run(fresh(), { type: 'DROP', ref: app('maps'), target: page(2, 10) })
    expect(findLocation(next.layout, app('maps'))).toEqual(page(2, 10))
  })
  it('refusal shakes and toasts', () => {
    const state = fresh()
    const next = homeScreenReducer(state, { type: 'DROP', ref: app('nope'), target: page(2, 10) })
    expect(next).toEqual({ ...state, shakeKey: 1, toast: { id: 1, text: 'Can’t move there' }, toastCounter: 1 })
  })
  it('a folder dropped on the dock says folders cannot go there', () => {
    const next = run(fresh(), { type: 'DROP', ref: folder('media'), target: { area: 'dock', slot: 0 } })
    expect(next.toast.text).toBe('Folders can’t go in the dock')
  })

  const inSocial = () =>
    run(editing(), { type: 'OPEN_FOLDER', folderId: 'social' }, { type: 'TOGGLE_FOLDER_SELECT', appId: 'bird' })

  it('a drop out of the open folder closes it and clears the folder selection', () => {
    const next = run(inSocial(), { type: 'DROP', ref: app('chat'), target: page(1, 6) })
    expect(findLocation(next.layout, app('chat'))).toEqual(page(1, 6))
    expect(next).toMatchObject({ openFolderId: null, folderSelection: [], editMode: true })
  })
  it('a drop from the open folder into another folder also closes it', () => {
    const next = run(inSocial(), { type: 'DROP', ref: app('chat'), target: page(0, 3) })
    expect(next.layout.folders.work.appIds).toContain('chat')
    expect(next.openFolderId).toBeNull()
  })
  it('a refused drop from the open folder shakes, says the spot is taken and keeps it open', () => {
    const state = inSocial()
    const next = run(state, { type: 'DROP', ref: app('chat'), target: page(0, 8) })
    expect(next).toEqual({ ...state, shakeKey: state.shakeKey + 1, toast: { id: 1, text: 'That spot is taken' }, toastCounter: 1 })
  })
  it('a refused drop from the open folder returns the pager to the folder page', () => {
    const state = deepFreeze({ ...inSocial(), page: 1 })
    const next = run(state, { type: 'DROP', ref: app('chat'), target: page(1, 0) })
    expect(next).toMatchObject({ page: 0, openFolderId: 'social', toast: { text: 'That spot is taken' } })
  })
  it('DRAG_CANCELLED from the open folder returns the pager to the folder page', () => {
    const state = deepFreeze({ ...inSocial(), page: 2 })
    expect(run(state, { type: 'DRAG_CANCELLED', ref: app('chat') })).toEqual({ ...state, page: 0 })
  })
  it('DRAG_CANCELLED changes nothing for home-screen drags or when already on the folder page', () => {
    const state = deepFreeze({ ...inSocial(), page: 2 })
    expect(homeScreenReducer(state, { type: 'DRAG_CANCELLED', ref: app('maps') })).toBe(state)
    const home = inSocial()
    expect(homeScreenReducer(home, { type: 'DRAG_CANCELLED', ref: app('chat') })).toBe(home)
    const closed = editing({ page: 2 })
    expect(homeScreenReducer(closed, { type: 'DRAG_CANCELLED', ref: app('chat') })).toBe(closed)
  })
  it('DRAG_CANCELLED leaves the page alone for a folder in the dock', () => {
    const base = editing()
    const layout = { ...base.layout, dock: [base.layout.dock[0], { type: 'folder', id: 'social' }, ...base.layout.dock.slice(2)] }
    const pages = layout.pages.map((cells) => cells.map((c) => (c?.type === 'folder' && c.id === 'social' ? null : c)))
    const state = deepFreeze(run({ ...base, layout: { ...layout, pages }, page: 2 }, { type: 'OPEN_FOLDER', folderId: 'social' }))
    expect(homeScreenReducer(state, { type: 'DRAG_CANCELLED', ref: app('chat') })).toBe(state)
  })
  it('dropping an app back on its own folder changes nothing', () => {
    const state = inSocial()
    expect(homeScreenReducer(state, { type: 'DROP', ref: app('chat'), target: page(0, 2) })).toBe(state)
  })
})

describe('sheets', () => {
  it('OPEN_SHEET / SHOW_NEW_FOLDER / CLOSE_SHEET', () => {
    const state = editing()
    const opened = run(state, { type: 'OPEN_SHEET' })
    expect(opened.sheet).toBe('move')
    expect(run(opened, { type: 'SHOW_NEW_FOLDER' }).sheet).toBe('new-folder')
    expect(run(opened, { type: 'CLOSE_SHEET' }).sheet).toBeNull()
  })
  it('sheet actions are no-ops when already in that state', () => {
    const state = editing()
    expect(homeScreenReducer(state, { type: 'CLOSE_SHEET' })).toBe(state)
    const opened = run(state, { type: 'OPEN_SHEET' })
    expect(homeScreenReducer(opened, { type: 'OPEN_SHEET' })).toBe(opened)
  })
  it('sheets only open in edit mode', () => {
    const state = fresh()
    expect(homeScreenReducer(state, { type: 'OPEN_SHEET' })).toBe(state)
    expect(homeScreenReducer(state, { type: 'SHOW_NEW_FOLDER' })).toBe(state)
  })
})

describe('MOVE_SELECTION_TO_FOLDER', () => {
  it('moves the selection into the folder, clears selection and closes sheet', () => {
    const state = deepFreeze({ ...selecting(app('maps'), app('notes')), sheet: 'move' })
    const next = homeScreenReducer(state, { type: 'MOVE_SELECTION_TO_FOLDER', folderId: 'work' })
    expect(next.layout.folders.work.appIds.slice(-2)).toEqual(['maps', 'notes'])
    expect(next.selection).toEqual([])
    expect(next.sheet).toBeNull()
  })
  it('is a no-op with empty selection', () => {
    const state = editing()
    expect(homeScreenReducer(state, { type: 'MOVE_SELECTION_TO_FOLDER', folderId: 'work' })).toBe(state)
  })
  it('refuses folders in the selection with a shake and a toast saying why', () => {
    const state = selecting(folder('media'))
    const next = homeScreenReducer(state, { type: 'MOVE_SELECTION_TO_FOLDER', folderId: 'work' })
    expect(next).toEqual({ ...state, shakeKey: 1, toast: { id: 1, text: 'Folders can’t go inside folders' }, toastCounter: 1 })
  })
  it('refuses an unknown folder with a shake and a generic toast', () => {
    const state = selecting(app('maps'))
    const next = homeScreenReducer(state, { type: 'MOVE_SELECTION_TO_FOLDER', folderId: 'ghost' })
    expect(next).toMatchObject({ layout: state.layout, shakeKey: 1, toast: { text: 'Can’t move there' } })
  })
})

describe('CREATE_FOLDER', () => {
  const create = (state, name = 'Road Trip!') => homeScreenReducer(state, { type: 'CREATE_FOLDER', name })
  it('creates a folder with a deterministic id and bumps the counter', () => {
    const state = deepFreeze({ ...selecting(app('maps'), app('notes')), sheet: 'new-folder', page: 1 })
    const next = create(state)
    expect(next.layout.folders['folder-road-trip-1']).toMatchObject({ name: 'Road Trip!', appIds: ['maps', 'notes'] })
    expect(next.folderCounter).toBe(2)
    expect(next.selection).toEqual([])
    expect(next.sheet).toBeNull()
  })
  it('uses the incremented counter for the next folder', () => {
    const first = create(selecting(app('maps')))
    const second = run({ ...first, editMode: true }, { type: 'TOGGLE_SELECT', ref: app('notes') })
    expect(create(second, 'Road Trip!').layout.folders['folder-road-trip-2']).toBeDefined()
  })
  it('is a no-op with empty selection', () => {
    const state = editing()
    expect(create(state)).toBe(state)
  })
  it('refuses a blank name with a shake and a toast', () => {
    const state = selecting(app('maps'))
    expect(create(state, '   ')).toMatchObject({ layout: state.layout, shakeKey: 1, toast: { text: 'Give the folder a name' } })
  })
  it('refuses a selection containing folders', () => {
    const state = selecting(app('maps'), folder('media'))
    expect(create(state)).toMatchObject({ layout: state.layout, shakeKey: 1, toast: { text: 'Folders can’t go inside folders' } })
  })
})

describe('folder interactions', () => {
  const opened = () => run(editing(), { type: 'OPEN_FOLDER', folderId: 'work' })

  it('OPEN_FOLDER / CLOSE_FOLDER', () => {
    const state = opened()
    expect(state.openFolderId).toBe('work')
    const closed = run({ ...state, folderSelection: ['x'] }, { type: 'CLOSE_FOLDER' })
    expect(closed).toMatchObject({ openFolderId: null, folderSelection: [] })
  })
  it('OPEN_FOLDER ignores unknown folders; CLOSE_FOLDER no-ops when closed', () => {
    const state = editing()
    expect(homeScreenReducer(state, { type: 'OPEN_FOLDER', folderId: 'ghost' })).toBe(state)
    expect(homeScreenReducer(state, { type: 'CLOSE_FOLDER' })).toBe(state)
  })
  it('TOGGLE_FOLDER_SELECT toggles apps inside the open folder only', () => {
    const state = opened()
    const [first] = state.layout.folders.work.appIds
    const on = run(state, { type: 'TOGGLE_FOLDER_SELECT', appId: first })
    expect(on.folderSelection).toEqual([first])
    expect(run(on, { type: 'TOGGLE_FOLDER_SELECT', appId: first }).folderSelection).toEqual([])
    expect(homeScreenReducer(state, { type: 'TOGGLE_FOLDER_SELECT', appId: 'maps' })).toBe(state)
    const closed = editing()
    expect(homeScreenReducer(closed, { type: 'TOGGLE_FOLDER_SELECT', appId: first })).toBe(closed)
  })
  it('MOVE_OUT_OF_FOLDER places selected apps on the current page', () => {
    const state = deepFreeze({ ...opened(), page: 2 })
    const [first] = state.layout.folders.work.appIds
    const next = run(state, { type: 'TOGGLE_FOLDER_SELECT', appId: first }, { type: 'MOVE_OUT_OF_FOLDER' })
    expect(findLocation(next.layout, app(first))).toMatchObject({ area: 'page', page: 2 })
    expect(next.folderSelection).toEqual([])
    expect(next.openFolderId).toBe('work')
  })
  it('MOVE_OUT_OF_FOLDER closes the folder when it was emptied', () => {
    const state = { ...opened(), page: 2 }
    const all = state.layout.folders.work.appIds
    const next = run(
      state,
      ...all.map((appId) => ({ type: 'TOGGLE_FOLDER_SELECT', appId })),
      { type: 'MOVE_OUT_OF_FOLDER' },
    )
    expect(next.layout.folders.work).toBeUndefined()
    expect(next.openFolderId).toBeNull()
  })
  it('MOVE_OUT_OF_FOLDER is a no-op with nothing selected', () => {
    const state = opened()
    expect(homeScreenReducer(state, { type: 'MOVE_OUT_OF_FOLDER' })).toBe(state)
  })
  it('MOVE_OUT_OF_FOLDER refusal shakes, toasts no room and keeps the selection', () => {
    const state = run(opened(), { type: 'TOGGLE_FOLDER_SELECT', appId: opened().layout.folders.work.appIds[0] })
    const next = homeScreenReducer(state, { type: 'MOVE_OUT_OF_FOLDER' })
    expect(next).toEqual({ ...state, shakeKey: 1, toast: { id: 1, text: 'Not enough room on this page' }, toastCounter: 1 })
  })
})

describe('SNAP_PAGE and DISMISS_TOAST', () => {
  it('SNAP_PAGE snaps the current page', () => {
    const state = fresh()
    const next = run(state, { type: 'GO_TO_PAGE', page: 1 }, { type: 'SNAP_PAGE' })
    expect(next.layout.pages[1].slice(0, 8).every((c) => c !== null)).toBe(true)
    expect(state.layout.pages[1][6]).toBeNull()
  })
  it('SNAP_PAGE on a snapped page returns the same state', () => {
    const state = run(fresh(), { type: 'GO_TO_PAGE', page: 2 })
    expect(homeScreenReducer(state, { type: 'SNAP_PAGE' })).toBe(state)
  })
  it('DISMISS_TOAST clears the toast', () => {
    const toasted = run(selecting(app('files')), { type: 'PLACE_SELECTION', target: page(0, 0) })
    expect(run(toasted, { type: 'DISMISS_TOAST' }).toast).toBeNull()
    expect(homeScreenReducer(toasted, { type: 'DISMISS_TOAST', id: 99 })).toBe(toasted)
  })
  it('DISMISS_TOAST with no toast is a no-op', () => {
    const state = fresh()
    expect(homeScreenReducer(state, { type: 'DISMISS_TOAST' })).toBe(state)
  })
  it('unknown actions return the same state', () => {
    const state = fresh()
    expect(homeScreenReducer(state, { type: 'NOPE' })).toBe(state)
  })
})

describe('selection reconciliation after layout changes', () => {
  it('DROP deselects a selected app that moved into a folder', () => {
    const state = deepFreeze(selecting(app('maps'), app('notes')))
    const next = homeScreenReducer(state, { type: 'DROP', ref: app('maps'), target: page(0, 2) })
    expect(next.selection).toEqual([app('notes')])
  })
  it('DROP keeps selection refs that still sit on the home screen', () => {
    const state = deepFreeze(selecting(app('maps'), app('notes')))
    const next = homeScreenReducer(state, { type: 'DROP', ref: app('maps'), target: page(2, 10) })
    expect(next.selection).toEqual([app('maps'), app('notes')])
  })
  it('DROP does not touch selection when the drop is a no-op', () => {
    const state = deepFreeze(selecting(app('maps')))
    const next = homeScreenReducer(state, { type: 'DROP', ref: app('maps'), target: page(0, 8) })
    expect(next).toBe(state)
  })
  it('MOVE_OUT_OF_FOLDER leaves no stale folder selection', () => {
    const state = deepFreeze({ ...editing(), openFolderId: 'media', folderSelection: ['videos'], page: 1 })
    const next = homeScreenReducer(state, { type: 'MOVE_OUT_OF_FOLDER' })
    expect(next.folderSelection).toEqual([])
    expect(next.selection.every((ref) => findLocation(next.layout, ref) !== null)).toBe(true)
  })
  it('drops a folder-area selection ref and a ref to a pruned folder', () => {
    const base = selecting(folder('media'))
    const withRef = deepFreeze({ ...base, selection: [...base.selection, app('mail')] })
    const next = homeScreenReducer(withRef, { type: 'DROP', ref: app('maps'), target: page(2, 10) })
    expect(next.selection).toEqual([folder('media')])
  })
})
