import { describe, expect, it } from 'vitest'
import { createInitialLayout } from './initialLayout.js'
import { placeGroup } from './layout.js'
import { isPageSnapped, snapPage } from './snap.js'
import { deepFreeze } from '../test/deepFreeze.js'
import { diffLayouts } from '../test/diffLayouts.js'

const app = (id) => ({ type: 'app', id })
const WIDGET_SLOTS = [0, 1, 4, 5]

function gappy() {
  // Move maps (page 0 slot 8) away, leaving a gap in the widget page.
  return placeGroup(createInitialLayout(), [app('maps')], { area: 'page', page: 1, slot: 6 }).layout
}

describe('snapPage', () => {
  it('compacts in reading order around the widget', () => {
    const l = gappy()
    const r = snapPage(l, 0)
    WIDGET_SLOTS.forEach((s) => expect(r.pages[0][s]).toEqual(l.pages[0][s]))
    expect(r.pages[0].slice(2, 4).map((c) => c.id)).toEqual(['social', 'work'])
    expect(r.pages[0][8]).toEqual(app('notes'))
    expect(r.pages[0][22]).toEqual(app('tv'))
    expect(r.pages[0][23]).toBeNull()
  })

  it('compacts a sparse page preserving relative order', () => {
    const r = snapPage(createInitialLayout(), 1)
    expect(r.pages[1].slice(0, 10).map((c) => c.id)).toEqual([
      'calculator', 'voicememos', 'translate', 'measure', 'shortcuts',
      'home', 'fitness', 'find', 'tips', 'news',
    ])
    expect(r.pages[1].slice(10).every((c) => c === null)).toBe(true)
  })

  it('leaves other pages and dock untouched', () => {
    const l = gappy()
    const r = snapPage(l, 0)
    expect(r.pages[1]).toBe(l.pages[1])
    expect(r.pages[2]).toBe(l.pages[2])
    expect(r.dock).toBe(l.dock)
    expect(r.folders).toBe(l.folders)
    expect(diffLayouts(l, r).every((d) => d.startsWith('page:0:'))).toBe(true)
  })

  it('returns the layout unchanged for an unknown page', () => {
    const l = createInitialLayout()
    expect(snapPage(l, 9)).toBe(l)
  })
})

describe('isPageSnapped', () => {
  it('is false for a gappy page and true after snapPage', () => {
    const l = gappy()
    expect(isPageSnapped(l, 0)).toBe(false)
    expect(isPageSnapped(snapPage(l, 0), 0)).toBe(true)
    expect(isPageSnapped(createInitialLayout(), 1)).toBe(false)
  })

  it('is true for a full page and an unknown page', () => {
    const l = createInitialLayout()
    expect(isPageSnapped(l, 0)).toBe(true)
    expect(isPageSnapped(l, 9)).toBe(true)
  })
})

describe('snap does not mutate frozen input', () => {
  it('works on frozen layouts', () => {
    const l = deepFreeze(createInitialLayout())
    expect(() => {
      snapPage(l, 1)
      isPageSnapped(l, 1)
    }).not.toThrow()
  })
})
