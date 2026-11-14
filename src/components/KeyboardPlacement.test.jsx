import { fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installGeometry, removeGeometry, renderHome } from '../test/homeHarness.js'

// Keyboard users can place a selection: in edit mode every empty slot (page and dock)
// is a focusable button, Enter/Space on it places the selection there, and focus then
// moves to the first placed icon.
beforeEach(() => {
  installGeometry()
})
afterEach(removeGeometry)

const press = (el, key) => fireEvent.keyDown(el, { key })

function editingWithSelected(key) {
  const ctx = renderHome()
  ctx.rightClick(ctx.slot('page:0:8'))
  press(ctx.item(key), 'Enter')
  expect(ctx.item(key)).toHaveAttribute('data-selected', 'true')
  fireEvent.click(ctx.q('[data-dot="1"]'))
  return ctx
}

describe('empty slots for keyboard users', () => {
  it('are focusable, labelled buttons in edit mode only; filled slots are not', () => {
    const ctx = renderHome()
    expect(ctx.slot('page:1:6')).not.toHaveAttribute('tabindex')
    ctx.rightClick(ctx.slot('page:0:8'))
    expect(ctx.slot('page:1:6')).toHaveAttribute('tabindex', '0')
    expect(ctx.slot('page:1:6')).toHaveAttribute('role', 'button')
    expect(ctx.slot('page:1:6')).toHaveAccessibleName('Empty slot 7, page 2')
    expect(ctx.slot('page:1:0')).not.toHaveAttribute('tabindex')
    expect(ctx.slot('page:0:0')).not.toHaveAttribute('tabindex')
  })

  it('Enter on an empty slot places the selection there and focuses the placed icon', () => {
    const ctx = editingWithSelected('app:maps')
    ctx.slot('page:1:6').focus()
    press(ctx.slot('page:1:6'), 'Enter')
    expect(ctx.slot('page:1:6').querySelector('[data-item="app:maps"]')).not.toBeNull()
    expect(ctx.slot('page:1:6')).not.toHaveAttribute('tabindex')
    expect(document.activeElement).toBe(ctx.item('app:maps'))
  })

  it('Space works too, and a placed folder takes focus on its button', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    press(ctx.q('[data-control="select:folder:social"]'), ' ')
    fireEvent.click(ctx.q('[data-dot="1"]'))
    press(ctx.slot('page:1:6'), ' ')
    expect(ctx.slot('page:1:6').querySelector('[data-item="folder:social"]')).not.toBeNull()
    expect(document.activeElement).toBe(ctx.q('[data-item="folder:social"] [role="button"]'))
  })

  it('a refused placement leaves focus on the slot and says why', () => {
    const ctx = editingWithSelected('app:maps')
    press(ctx.item('app:calculator'), 'Enter')
    fireEvent.click(ctx.q('[data-dot="2"]'))
    const last = ctx.slot('page:2:23')
    last.focus()
    press(last, 'Enter')
    expect(document.activeElement).toBe(last)
    expect(ctx.q('[data-control="toast"]')).toHaveTextContent('Not enough room on this page')
  })

  it('an emptied dock slot becomes a labelled button that takes an app back', () => {
    const ctx = editingWithSelected('app:music')
    press(ctx.slot('page:1:6'), 'Enter')
    expect(ctx.slot('dock:3')).toHaveAttribute('tabindex', '0')
    expect(ctx.slot('dock:3')).toHaveAccessibleName('Empty dock slot 4')
    press(ctx.item('app:music'), 'Enter')
    press(ctx.slot('dock:3'), 'Enter')
    expect(ctx.slot('dock:3').querySelector('[data-item="app:music"]')).not.toBeNull()
    expect(document.activeElement).toBe(ctx.item('app:music'))
  })
})
