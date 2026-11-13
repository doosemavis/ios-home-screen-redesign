import { describe, expect, it } from 'vitest'
import { createInitialLayout } from './initialLayout.js'
import { getCell } from './layout.js'
import { dropItem } from './drop.js'
import { deepFreeze } from '../test/deepFreeze.js'
import { diffLayouts } from '../test/diffLayouts.js'

const app = (id) => ({ type: 'app', id })
const folder = (id) => ({ type: 'folder', id })
const page = (p, slot) => ({ area: 'page', page: p, slot })
const dock = (slot) => ({ area: 'dock', slot })
const invalid = { ok: false, reason: 'invalid-target' }

describe('dropItem', () => {
  it('places an app on an empty cell', () => {
    const l = createInitialLayout()
    const r = dropItem(l, app('maps'), page(1, 6))
    expect(r.ok).toBe(true)
    expect(getCell(r.layout, page(1, 6))).toEqual(app('maps'))
    expect(getCell(r.layout, page(0, 8))).toBeNull()
    expect(diffLayouts(l, r.layout)).toEqual(['page:0:8', 'page:1:6'])
  })

  it('places a folder on an empty cell', () => {
    const l = createInitialLayout()
    const r = dropItem(l, folder('media'), page(1, 6))
    expect(getCell(r.layout, page(1, 6))).toEqual(folder('media'))
    expect(diffLayouts(l, r.layout)).toEqual(['page:0:6', 'page:1:6'])
  })

  it('swaps app with app', () => {
    const l = createInitialLayout()
    const r = dropItem(l, app('maps'), page(0, 9))
    expect(getCell(r.layout, page(0, 9))).toEqual(app('maps'))
    expect(getCell(r.layout, page(0, 8))).toEqual(app('notes'))
    expect(diffLayouts(l, r.layout)).toEqual(['page:0:8', 'page:0:9'])
  })

  it('swaps folder with folder', () => {
    const l = createInitialLayout()
    const r = dropItem(l, folder('social'), page(0, 3))
    expect(getCell(r.layout, page(0, 2))).toEqual(folder('work'))
    expect(getCell(r.layout, page(0, 3))).toEqual(folder('social'))
    expect(diffLayouts(l, r.layout)).toEqual(['page:0:2', 'page:0:3'])
  })

  it('moves an app into the folder it is dropped on', () => {
    const l = createInitialLayout()
    const r = dropItem(l, app('notes'), page(0, 2))
    expect(r.ok).toBe(true)
    expect(r.layout.folders.social.appIds.at(-1)).toBe('notes')
    expect(getCell(r.layout, page(0, 9))).toBeNull()
    expect(diffLayouts(l, r.layout)).toEqual(['folder:social', 'page:0:9'])
  })

  it('moves a dock app into a folder leaving a dock gap', () => {
    const l = createInitialLayout()
    const r = dropItem(l, app('phone'), page(0, 2))
    expect(r.layout.dock[0]).toBeNull()
    expect(diffLayouts(l, r.layout)).toEqual(['dock:0', 'folder:social'])
  })

  it('swaps a folder with an app on the page area', () => {
    const l = createInitialLayout()
    const r = dropItem(l, folder('media'), page(0, 8))
    expect(getCell(r.layout, page(0, 8))).toEqual(folder('media'))
    expect(getCell(r.layout, page(0, 6))).toEqual(app('maps'))
    expect(diffLayouts(l, r.layout)).toEqual(['page:0:6', 'page:0:8'])
  })

  it('rejects dropping a folder on a dock app (no opposite-type swap in the dock)', () => {
    const l = createInitialLayout()
    expect(dropItem(l, folder('media'), dock(0))).toEqual(invalid)
  })

  it('rejects an app from inside a folder dropped on an occupied cell', () => {
    const l = createInitialLayout()
    expect(dropItem(l, app('chat'), page(0, 8))).toEqual(invalid)
    expect(dropItem(l, app('chat'), page(0, 3))).toEqual(invalid)
    expect(dropItem(l, app('chat'), dock(1))).toEqual(invalid)
  })

  it('takes an app out of a folder when dropped on an empty cell', () => {
    const l = createInitialLayout()
    const r = dropItem(l, app('chat'), page(1, 6))
    expect(r.layout.folders.social.appIds).not.toContain('chat')
    expect(diffLayouts(l, r.layout)).toEqual(['folder:social', 'page:1:6'])
  })

  it('deletes a folder whose sole app is dropped on an empty cell or dock slot', () => {
    const base = createInitialLayout()
    const one = { ...base.folders.utilities, appIds: ['scanner'] }
    const l = { ...base, dock: [app('phone'), null, null, app('music')], folders: { ...base.folders, utilities: one } }
    const toPage = dropItem(l, app('scanner'), page(1, 6))
    expect(toPage.layout.folders.utilities).toBeUndefined()
    expect(getCell(toPage.layout, page(0, 7))).toBeNull()
    expect(diffLayouts(l, toPage.layout)).toEqual(['folder:utilities', 'page:0:7', 'page:1:6'])
    const toDock = dropItem(l, app('scanner'), dock(1))
    expect(toDock.layout.folders.utilities).toBeUndefined()
    expect(diffLayouts(l, toDock.layout)).toEqual(['dock:1', 'folder:utilities', 'page:0:7'])
  })

  it('rejects any drop on a widget cell', () => {
    const l = createInitialLayout()
    expect(dropItem(l, app('notes'), page(0, 5))).toEqual(invalid)
    expect(dropItem(l, app('notes'), page(0, 0))).toEqual(invalid)
    expect(dropItem(l, folder('media'), page(0, 1))).toEqual(invalid)
    expect(dropItem(l, app('chat'), page(0, 4))).toEqual(invalid)
  })

  it('rejects dropping a folder on the dock, empty or occupied', () => {
    const base = createInitialLayout()
    const l = { ...base, dock: [null, null, app('browser'), null] }
    expect(dropItem(l, folder('media'), dock(0))).toEqual(invalid)
    expect(dropItem(l, folder('media'), dock(2))).toEqual(invalid)
  })

  it('moves apps between the page and the dock', () => {
    const base = createInitialLayout()
    const l = { ...base, dock: [app('phone'), null, null, app('music')] }
    const r = dropItem(l, app('maps'), dock(1))
    expect(r.layout.dock[1]).toEqual(app('maps'))
    const swapped = dropItem(r.layout, app('notes'), dock(1))
    expect(swapped.layout.dock[1]).toEqual(app('notes'))
    expect(getCell(swapped.layout, page(0, 9))).toEqual(app('maps'))
  })

  it('treats dropping an item on its own location as a no-op', () => {
    const l = createInitialLayout()
    for (const [ref, loc] of [
      [app('maps'), page(0, 8)],
      [folder('media'), page(0, 6)],
      [app('phone'), dock(0)],
    ]) {
      const r = dropItem(l, ref, loc)
      expect(r.ok).toBe(true)
      expect(diffLayouts(l, r.layout)).toEqual([])
    }
  })

  it('rejects invalid refs and out-of-range or folder targets', () => {
    const l = createInitialLayout()
    expect(dropItem(l, { type: 'widget', id: 'weather' }, page(1, 6))).toEqual({
      ok: false,
      reason: 'invalid-refs',
    })
    expect(dropItem(l, app('ghost'), page(1, 6)).reason).toBe('invalid-refs')
    expect(dropItem(l, app('maps'), page(9, 0))).toEqual(invalid)
    expect(dropItem(l, app('maps'), page(0, 99))).toEqual(invalid)
    expect(dropItem(l, app('maps'), dock(9))).toEqual(invalid)
    expect(dropItem(l, app('maps'), { area: 'folder', folderId: 'social' })).toEqual(invalid)
  })

  it('does not mutate frozen input', () => {
    const l = deepFreeze(createInitialLayout())
    expect(() => {
      dropItem(l, app('maps'), page(0, 9))
      dropItem(l, app('notes'), page(0, 2))
      dropItem(l, folder('media'), page(1, 6))
    }).not.toThrow()
  })
})
