import { describe, expect, it } from 'vitest'
import { createInitialLayout } from './initialLayout.js'
import { findLocation, getCell, placeGroup } from './layout.js'
import { DOCK_SLOTS, PAGE_COUNT, SLOTS_PER_PAGE } from './constants.js'
import { deepFreeze } from '../test/deepFreeze.js'

const app = (id) => ({ type: 'app', id })
const pageLoc = (page, slot) => ({ area: 'page', page, slot })
const dockLoc = (slot) => ({ area: 'dock', slot })

function changedCells(a, b) {
  const diffs = []
  a.pages.forEach((p, pi) =>
    p.forEach((c, si) => {
      if (JSON.stringify(c) !== JSON.stringify(b.pages[pi][si])) diffs.push([pi, si])
    }),
  )
  return diffs
}

describe('createInitialLayout', () => {
  it('has 3 pages of 24 slots and 4 dock slots', () => {
    const l = createInitialLayout()
    expect(l.pages).toHaveLength(PAGE_COUNT)
    l.pages.forEach((p) => expect(p).toHaveLength(SLOTS_PER_PAGE))
    expect(l.dock).toHaveLength(DOCK_SLOTS)
  })

  it('page 1 widget occupies slots 0,1,4,5 with anchor only at 0', () => {
    const l = createInitialLayout()
    const widgetSlots = l.pages[0]
      .map((c, i) => (c?.type === 'widget' ? i : -1))
      .filter((i) => i >= 0)
    expect(widgetSlots).toEqual([0, 1, 4, 5])
    expect(l.pages[0].filter((c) => c?.type === 'widget' && c.anchor)).toHaveLength(1)
    expect(l.pages[0][0].anchor).toBe(true)
  })

  it('leaves the scene target slots empty on the second page', () => {
    const l = createInitialLayout()
    ;[6, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23].forEach((s) =>
      expect(l.pages[1][s]).toBeNull(),
    )
  })
})

describe('findLocation', () => {
  it('finds apps on pages, in the dock and inside folders', () => {
    const l = createInitialLayout()
    const slot = l.pages[0].findIndex((c) => c?.id === 'maps')
    expect(findLocation(l, app('maps'))).toEqual(pageLoc(0, slot))
    expect(findLocation(l, app('phone'))).toEqual(dockLoc(0))
    expect(findLocation(l, app('chat'))).toEqual({ area: 'folder', folderId: 'social' })
    expect(findLocation(l, { type: 'folder', id: 'work' })).toEqual(pageLoc(0, 3))
    expect(findLocation(l, app('nope'))).toBeNull()
  })
})

describe('getCell', () => {
  it('reads page and dock cells and returns null for folder locations', () => {
    const l = createInitialLayout()
    expect(getCell(l, pageLoc(0, 8))).toEqual(app('maps'))
    expect(getCell(l, dockLoc(3))).toEqual(app('music'))
    expect(getCell(l, { area: 'folder', folderId: 'social' })).toBeNull()
  })
})

describe('placeGroup', () => {
  it('places one app into an empty slot on another page and leaves a gap', () => {
    const l = createInitialLayout()
    const oldSlot = findLocation(l, app('maps')).slot
    const r = placeGroup(l, [app('maps')], pageLoc(1, 6))
    expect(r.ok).toBe(true)
    expect(getCell(r.layout, pageLoc(1, 6))).toEqual(app('maps'))
    expect(getCell(r.layout, pageLoc(0, oldSlot))).toBeNull()
    expect(changedCells(l, r.layout).sort()).toEqual([[0, oldSlot], [1, 6]].sort())
  })

  it('places several apps in selection order into tapped slot then next empty slots in reading order', () => {
    const l = createInitialLayout()
    const refs = [app('notes'), app('podcasts'), app('compass')]
    const r = placeGroup(l, refs, pageLoc(1, 13))
    expect(r.ok).toBe(true)
    expect(getCell(r.layout, pageLoc(1, 13))).toEqual(app('notes'))
    expect(getCell(r.layout, pageLoc(1, 14))).toEqual(app('podcasts'))
    expect(getCell(r.layout, pageLoc(1, 15))).toEqual(app('compass'))
    const expected = refs.map((r0) => findLocation(l, r0)).map((x) => [x.page, x.slot])
    expect(changedCells(l, r.layout)).toHaveLength(6)
    expected.forEach(([p, s]) => expect(r.layout.pages[p][s]).toBeNull())
  })

  it('skips occupied cells while walking in reading order', () => {
    const l = createInitialLayout()
    const r = placeGroup(l, [app('notes'), app('podcasts')], pageLoc(1, 7))
    expect(r.ok).toBe(true)
    expect(getCell(r.layout, pageLoc(1, 7))).toEqual(app('notes'))
    expect(getCell(r.layout, pageLoc(1, 10))).toEqual(app('podcasts'))
  })

  it('counts vacated slots on the target page as free', () => {
    const l = createInitialLayout()
    // calculator sits at page 1 slot 0; target slot 6 then free 7.. ; selection
    // includes an app at slot 9 which becomes free for reuse
    const refs = [app('news'), app('tips'), app('find')] // slots 17, 16, 9
    const r = placeGroup(l, refs, pageLoc(1, 6))
    expect(r.ok).toBe(true)
    expect(getCell(r.layout, pageLoc(1, 6))).toEqual(app('news'))
    expect(getCell(r.layout, pageLoc(1, 7))).toEqual(app('tips'))
    expect(getCell(r.layout, pageLoc(1, 9))).toEqual(app('find'))
  })

  it('refuses when not enough empty slots after target', () => {
    const l = deepFreeze(createInitialLayout())
    const refs = [app('notes'), app('podcasts'), app('compass')]
    const r = placeGroup(l, refs, pageLoc(1, 22))
    expect(r).toEqual({ ok: false, reason: 'not-enough-space' })
    const r2 = placeGroup(l, refs, pageLoc(1, 22))
    expect(r2.layout).toBeUndefined()
  })

  it('returns the same layout reference semantics on refusal (input unchanged)', () => {
    const l = createInitialLayout()
    const snapshot = JSON.stringify(l)
    placeGroup(l, [app('notes'), app('podcasts'), app('compass')], pageLoc(1, 22))
    expect(JSON.stringify(l)).toBe(snapshot)
  })

  it('places into the dock filling the tapped dock slot then the next empty dock slots', () => {
    const base = createInitialLayout()
    const l = { ...base, dock: [app('phone'), null, null, app('music')] }
    const r = placeGroup(l, [app('maps'), app('notes')], dockLoc(1))
    expect(r.ok).toBe(true)
    expect(r.layout.dock.map((c) => c?.id)).toEqual(['phone', 'maps', 'notes', 'music'])
  })

  it('refuses dock overflow and invalid dock refs', () => {
    const base = createInitialLayout()
    const l = { ...base, dock: [app('phone'), null, null, app('music')] }
    expect(placeGroup(l, [app('a'), app('b'), app('c')], dockLoc(1))).toEqual({
      ok: false,
      reason: 'not-enough-space',
    })
  })

  it('refuses placing folders or widgets into the dock', () => {
    const base = createInitialLayout()
    const l = { ...base, dock: [null, null, null, null] }
    const f = placeGroup(l, [{ type: 'folder', id: 'social' }], dockLoc(0))
    expect(f).toEqual({ ok: false, reason: 'invalid-target' })
    const w = placeGroup(l, [{ type: 'widget', id: 'weather' }], dockLoc(0))
    expect(w).toEqual({ ok: false, reason: 'invalid-target' })
  })

  it('refuses targets on occupied or widget cells', () => {
    const l = createInitialLayout()
    const occupied = placeGroup(l, [app('notes')], pageLoc(1, 0))
    expect(occupied).toEqual({ ok: false, reason: 'invalid-target' })
    const onWidget = placeGroup(l, [app('notes')], pageLoc(0, 5))
    expect(onWidget).toEqual({ ok: false, reason: 'invalid-target' })
    const filledDock = placeGroup(l, [app('notes')], dockLoc(0))
    expect(filledDock).toEqual({ ok: false, reason: 'invalid-target' })
  })

  it('refuses out-of-range and folder targets', () => {
    const l = createInitialLayout()
    expect(placeGroup(l, [app('notes')], pageLoc(9, 0)).reason).toBe('invalid-target')
    expect(placeGroup(l, [app('notes')], pageLoc(0, 99)).reason).toBe('invalid-target')
    expect(placeGroup(l, [app('notes')], dockLoc(7)).reason).toBe('invalid-target')
    expect(
      placeGroup(l, [app('notes')], { area: 'folder', folderId: 'social' }).reason,
    ).toBe('invalid-target')
  })

  it('takes apps out of folders when placed', () => {
    const l = createInitialLayout()
    const r = placeGroup(l, [app('chat')], pageLoc(1, 6))
    expect(r.ok).toBe(true)
    expect(r.layout.folders.social.appIds).not.toContain('chat')
    expect(r.layout.folders.social.appIds).toHaveLength(3)
    expect(getCell(r.layout, pageLoc(1, 6))).toEqual(app('chat'))
  })

  it('moves a folder ref between pages', () => {
    const l = createInitialLayout()
    const r = placeGroup(l, [{ type: 'folder', id: 'media' }], pageLoc(1, 6))
    expect(r.ok).toBe(true)
    expect(getCell(r.layout, pageLoc(0, 6))).toBeNull()
    expect(getCell(r.layout, pageLoc(1, 6))).toEqual({ type: 'folder', id: 'media' })
  })

  it('does not mutate input', () => {
    const l = deepFreeze(createInitialLayout())
    expect(() =>
      placeGroup(l, [app('notes'), app('chat'), app('phone')], pageLoc(1, 12)),
    ).not.toThrow()
  })
})
