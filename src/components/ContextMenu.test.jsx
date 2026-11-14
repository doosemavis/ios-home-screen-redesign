import { act, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { at, installGeometry, removeGeometry, renderHome } from '../test/homeHarness.js'

// Right-click toggles edit mode for mouse users. On touch, the browser also fires
// contextmenu after a long-press; long-press owns touch, so that contextmenu is ignored.
const LONG_PRESS_MS = 500
const touch = { ...at(100), pointerType: 'touch' }
const mouse = { ...at(100), pointerType: 'mouse' }

beforeEach(() => {
  installGeometry()
})
afterEach(removeGeometry)

function longPressByTouch(ctx, el) {
  fireEvent.pointerDown(el, touch)
  act(() => ctx.clock.advance(LONG_PRESS_MS))
  fireEvent.contextMenu(el)
  fireEvent.pointerUp(el, touch)
}

describe('contextmenu on the home screen', () => {
  it('a touch long-press enters edit mode and its contextmenu does not toggle it back off', () => {
    const ctx = renderHome()
    longPressByTouch(ctx, ctx.slot('page:0:8'))
    expect(ctx.editMode()).toBe(true)
  })

  it('a contextmenu after a touch press never exits edit mode', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    fireEvent.pointerDown(ctx.slot('page:0:8'), touch)
    fireEvent.contextMenu(ctx.slot('page:0:8'))
    expect(ctx.editMode()).toBe(true)
  })

  it('a mouse right-click still toggles both ways', () => {
    const ctx = renderHome()
    fireEvent.pointerDown(ctx.slot('page:0:8'), touch)
    fireEvent.pointerUp(ctx.slot('page:0:8'), touch)
    fireEvent.pointerDown(ctx.slot('page:0:8'), { ...mouse, button: 2 })
    ctx.rightClick(ctx.slot('page:0:8'))
    expect(ctx.editMode()).toBe(true)
    ctx.rightClick(ctx.slot('page:0:8'))
    expect(ctx.editMode()).toBe(false)
  })

  it('always suppresses the native menu', () => {
    const ctx = renderHome()
    fireEvent.pointerDown(ctx.slot('page:0:8'), touch)
    expect(fireEvent.contextMenu(ctx.slot('page:0:8'))).toBe(false)
  })
})

describe('contextmenu inside an open folder', () => {
  it('a touch long-press on a folder app enters edit mode; its contextmenu changes nothing more', () => {
    const ctx = renderHome()
    ctx.tap(ctx.item('folder:social'))
    longPressByTouch(ctx, ctx.inFolder('chat'))
    expect(ctx.editMode()).toBe(true)
    expect(ctx.q('[data-folder-overlay="social"]')).not.toBeNull()
  })

  it('a touch contextmenu alone does not enter edit mode; a mouse right-click does', () => {
    const ctx = renderHome()
    ctx.tap(ctx.item('folder:social'))
    fireEvent.pointerDown(ctx.inFolder('chat'), touch)
    fireEvent.pointerUp(ctx.inFolder('chat'), touch)
    fireEvent.contextMenu(ctx.inFolder('chat'))
    expect(ctx.editMode()).toBe(false)
    fireEvent.pointerDown(ctx.inFolder('chat'), { ...mouse, button: 2 })
    ctx.rightClick(ctx.inFolder('chat'))
    expect(ctx.editMode()).toBe(true)
  })
})
