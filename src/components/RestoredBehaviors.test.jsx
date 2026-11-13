import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { at, dragDrop, dragOver, installGeometry, removeGeometry, renderHome } from '../test/homeHarness.js'

// Behaviors 1-5 of the original prototype (cca767d) that the rebuild must keep.
// Behavior 6 (dragging apps out of an open folder) lives in FolderDrag.test.jsx.
let hit
beforeEach(() => {
  hit = installGeometry()
})
afterEach(removeGeometry)

const overlay = (ctx) => ctx.q('[data-folder-overlay]')

describe('1. folders open outside edit mode', () => {
  it('a tap on a folder opens it; taps on its apps neither select nor show Move Out', () => {
    const ctx = renderHome()
    ctx.tap(ctx.item('folder:social'))
    expect(ctx.q('[data-folder-overlay="social"]')).not.toBeNull()
    expect(ctx.editMode()).toBe(false)
    fireEvent.click(ctx.inFolder('chat'))
    expect(ctx.inFolder('chat')).toHaveAttribute('data-selected', 'false')
    expect(ctx.q('[data-control="move-out"]')).toBeNull()
  })

  it('an app in the overlay cannot be dragged outside edit mode', () => {
    const ctx = renderHome()
    ctx.tap(ctx.item('folder:social'))
    dragOver(ctx, hit, ctx.inFolder('chat'), 'page:1:6')
    expect(ctx.q('[data-drag-ghost]')).toBeNull()
  })
})

describe('2. a wallpaper tap exits edit mode', () => {
  const editing = () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    return ctx
  }

  it('exits with nothing selected', () => {
    const ctx = editing()
    ctx.tap(ctx.q('[data-page="0"]'))
    expect(ctx.editMode()).toBe(false)
  })

  it('never from an empty slot or the dock bar', () => {
    const ctx = editing()
    fireEvent.click(ctx.q('[data-dot="1"]'))
    ctx.tap(ctx.slot('page:1:6'))
    ctx.tap(ctx.q('[data-dock]'))
    expect(ctx.editMode()).toBe(true)
  })

  it('does nothing while something is selected', () => {
    const ctx = editing()
    ctx.tap(ctx.item('app:maps'))
    ctx.tap(ctx.q('[data-page="0"]'))
    expect(ctx.editMode()).toBe(true)
    expect(ctx.item('app:maps')).toHaveAttribute('data-selected', 'true')
  })

  it('the release of a swipe or a drag over wallpaper is not a tap', () => {
    const ctx = editing()
    const grid = ctx.q('[data-page="0"]')
    fireEvent.pointerDown(grid, at(300))
    fireEvent.pointerMove(grid, at(180))
    fireEvent.pointerUp(grid, at(180))
    expect(ctx.q('[data-dot="1"]')).toHaveAttribute('aria-current', 'page')
    dragDrop(ctx, hit, ctx.item('app:calculator'), null)
    expect(ctx.editMode()).toBe(true)
  })
})

describe('3. right-click toggles edit mode', () => {
  it('enters, then exits with the selection cleared', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    ctx.tap(ctx.item('app:maps'))
    ctx.rightClick(ctx.slot('page:0:12'))
    expect(ctx.editMode()).toBe(false)
    ctx.rightClick(ctx.slot('page:0:12'))
    expect(ctx.editMode()).toBe(true)
    expect(ctx.item('app:maps')).toHaveAttribute('data-selected', 'false')
  })
})

describe('4. right-click inside an open folder', () => {
  it('enters edit mode and keeps the folder open; a second right-click keeps both', () => {
    const ctx = renderHome()
    ctx.tap(ctx.item('folder:social'))
    ctx.rightClick(ctx.inFolder('chat'))
    expect(ctx.editMode()).toBe(true)
    expect(overlay(ctx)).not.toBeNull()
    ctx.rightClick(ctx.q('[data-overlay-backdrop]'))
    expect(ctx.editMode()).toBe(true)
    expect(overlay(ctx)).not.toBeNull()
  })
})

describe('5. "N selected" in the folder overlay', () => {
  it('shows the folder selection count next to the name, in edit mode only', () => {
    const ctx = renderHome()
    ctx.tap(ctx.item('folder:social'))
    ctx.rightClick(ctx.inFolder('chat'))
    expect(ctx.q('[data-folder-badge]')).toBeNull()
    fireEvent.click(ctx.inFolder('chat'))
    fireEvent.click(ctx.inFolder('bird'))
    const badge = ctx.q('[data-folder-overlay] [data-folder-badge]')
    expect(badge).toHaveTextContent('2 selected')
    expect(badge.parentElement).toContainElement(ctx.q('[data-folder-overlay] h2'))
  })
})
