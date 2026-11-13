import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import {
  SCREEN_WIDTH, at, changedKeys, dragDrop, dragOver, installGeometry, removeGeometry, renderHome, slotMap,
} from '../test/homeHarness.js'

// Behavior 6: in edit mode an app inside the open folder drags like a home-screen icon.
let hit
beforeEach(() => {
  hit = installGeometry()
})
afterEach(removeGeometry)

// Edit mode with a free slot at page:0:8 (maps dragged to page 1), Social open.
function openSocialWithGap() {
  const ctx = renderHome()
  ctx.rightClick(ctx.slot('page:0:8'))
  dragDrop(ctx, hit, ctx.item('app:maps'), 'page:1:6')
  ctx.tap(ctx.item('folder:social'))
  return ctx
}

const overlay = (ctx) => ctx.q('[data-folder-overlay]')
const panelShake = (ctx) => ctx.q('[data-folder-panel]').getAttribute('data-shake')

describe('dragging an app out of an open folder', () => {
  it('shows the ghost, fades the overlay and lets hit testing reach the home screen', () => {
    const ctx = openSocialWithGap()
    dragOver(ctx, hit, ctx.inFolder('chat'), 'page:0:8')
    expect(ctx.q('[data-drag-ghost]')).not.toBeNull()
    expect(overlay(ctx)).toHaveAttribute('data-dragging', 'true')
    expect(ctx.inFolder('chat')).toHaveAttribute('data-drag-source', 'true')
    expect(ctx.q('[data-pager-track]').closest('[inert]')).toBeNull()
    expect(ctx.slot('page:0:8').querySelector('[data-drop-target="true"]')).not.toBeNull()
  })

  it('drops onto an empty page slot, closes the overlay, and nothing else moves', () => {
    const ctx = openSocialWithGap()
    const before = slotMap(ctx)
    dragDrop(ctx, hit, ctx.inFolder('chat'), 'page:0:8')
    const after = slotMap(ctx)
    expect(after['app:chat']).toBe('page:0:8')
    expect(changedKeys(before, after)).toEqual(['app:chat'])
    expect(overlay(ctx)).toBeNull()
    expect(ctx.editMode()).toBe(true)
    ctx.tap(ctx.item('folder:social'))
    expect(ctx.inFolder('chat')).toBeNull()
  })

  it('clears the folder selection on a successful drop', () => {
    const ctx = openSocialWithGap()
    fireEvent.click(ctx.inFolder('bird'))
    dragDrop(ctx, hit, ctx.inFolder('chat'), 'page:0:8')
    ctx.tap(ctx.item('folder:social'))
    expect(ctx.inFolder('bird')).toHaveAttribute('data-selected', 'false')
    expect(ctx.q('[data-folder-badge]')).toBeNull()
  })

  it('refuses an occupied app slot with a shake: no reflow, folder stays open', () => {
    const ctx = openSocialWithGap()
    const before = slotMap(ctx)
    expect(panelShake(ctx)).toBe('none')
    dragOver(ctx, hit, ctx.inFolder('chat'), 'page:0:9')
    expect(ctx.q('[data-drop-target]')).toBeNull()
    fireEvent.pointerUp(ctx.inFolder('chat'), at(200))
    expect(slotMap(ctx)).toEqual(before)
    expect(ctx.inFolder('chat')).not.toBeNull()
    expect(overlay(ctx)).not.toHaveAttribute('data-dragging')
    expect(panelShake(ctx)).not.toBe('none')
  })

  it('drops into another folder and closes the overlay', () => {
    const ctx = openSocialWithGap()
    dragDrop(ctx, hit, ctx.inFolder('chat'), 'page:0:3')
    expect(overlay(ctx)).toBeNull()
    ctx.tap(ctx.item('folder:work'))
    expect(ctx.inFolder('chat')).not.toBeNull()
  })

  it('dropping back on its own folder is a quiet no-op', () => {
    const ctx = openSocialWithGap()
    dragDrop(ctx, hit, ctx.inFolder('chat'), 'page:0:2')
    expect(overlay(ctx)).not.toBeNull()
    expect(ctx.inFolder('chat')).not.toBeNull()
    expect(panelShake(ctx)).toBe('none')
  })

  it('turns the page when held at the screen edge', () => {
    const ctx = openSocialWithGap()
    const chat = ctx.inFolder('chat')
    dragOver(ctx, hit, chat, null)
    fireEvent.pointerMove(chat, at(SCREEN_WIDTH - 10))
    act(() => ctx.clock.advance(600))
    expect(ctx.q('[data-dot="1"]')).toHaveAttribute('aria-current', 'page')
    hit.el = ctx.slot('page:1:7')
    fireEvent.pointerUp(chat, at(SCREEN_WIDTH - 10))
    expect(slotMap(ctx)['app:chat']).toBe('page:1:7')
  })
})
