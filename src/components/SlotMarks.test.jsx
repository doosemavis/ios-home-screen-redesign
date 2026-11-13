import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { dragDrop, dragOver, installGeometry, removeGeometry, renderHome } from '../test/homeHarness.js'

// Empty-slot affordance and the drop glow: one icon-sized mark per slot.
const markCss = readFileSync(resolve(cwd(), 'src/components/SlotMark.module.css'), 'utf8')
let hit
beforeEach(() => {
  hit = installGeometry()
})
afterEach(removeGeometry)

const marks = (ctx) => ctx.qa('[data-slot-mark]')
const emptySlots = (ctx) =>
  ctx.qa('[data-slot]').filter((slot) => slot.querySelector('[data-item], [data-widget]') === null)
const markIn = (ctx, name) => ctx.slot(name).querySelector('[data-slot-mark]')

describe('empty-slot placeholders', () => {
  it('are absent outside edit mode', () => {
    const ctx = renderHome()
    expect(marks(ctx)).toHaveLength(0)
  })

  it('sit in every empty page and dock slot in edit mode, never on items or the widget', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    dragDrop(ctx, hit, ctx.item('app:phone'), 'page:1:6')
    const empty = emptySlots(ctx)
    expect(empty.map((s) => s.getAttribute('data-slot'))).toContain('dock:0')
    expect(marks(ctx)).toHaveLength(empty.length)
    empty.forEach((slot) => expect(slot.querySelector('[data-slot-mark="idle"]')).not.toBeNull())
    expect(ctx.slot('page:0:0').querySelector('[data-slot-mark]')).toBeNull()
    expect(markIn(ctx, 'page:0:9')).toBeNull()
    marks(ctx).forEach((mark) => {
      expect(mark).not.toHaveAttribute('data-item')
      expect(mark).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('pulse while something is selected', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    ctx.tap(ctx.item('app:maps'))
    const mark = markIn(ctx, 'page:1:6')
    expect(mark).toHaveAttribute('data-slot-mark', 'ready')
    expect(mark.className).toMatch(/pulse/)
    ctx.tap(ctx.item('app:maps'))
    expect(markIn(ctx, 'page:1:6').className).not.toMatch(/pulse/)
  })

  it('a tap on a placeholder places the selection', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    ctx.tap(ctx.item('app:maps'))
    ctx.tap(markIn(ctx, 'page:1:6'))
    expect(ctx.slot('page:1:6').querySelector('[data-item="app:maps"]')).not.toBeNull()
  })
})

describe('drop glow', () => {
  it('is the icon-sized mark inside the hovered empty slot, not the slot', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    dragOver(ctx, hit, ctx.item('app:maps'), 'page:1:6')
    const glow = ctx.q('[data-drop-target="true"]')
    expect(glow).toBe(markIn(ctx, 'page:1:6'))
    expect(glow).toHaveAttribute('data-slot-mark', 'hover')
    expect(ctx.slot('page:1:6')).not.toHaveAttribute('data-drop-target')
    expect(ctx.qa('[data-drop-target]')).toHaveLength(1)
  })

  it('is an icon-sized mark over an occupied target too, in pages and the dock', () => {
    const ctx = renderHome()
    ctx.rightClick(ctx.slot('page:0:8'))
    dragOver(ctx, hit, ctx.item('app:maps'), 'page:0:9')
    expect(ctx.q('[data-drop-target="true"]')).toBe(markIn(ctx, 'page:0:9'))
    fireEvent.pointerCancel(ctx.item('app:maps'))
    dragOver(ctx, hit, ctx.item('app:notes'), 'dock:1')
    expect(ctx.q('[data-drop-target="true"]')).toBe(markIn(ctx, 'dock:1'))
  })

  it('the mark is a 60×60 squircle at the icon radius, centred over the icon', () => {
    const rule = markCss.match(/\.mark\s*{([^}]*)}/)[1]
    expect(rule).toMatch(/width:\s*60px/)
    expect(rule).toMatch(/height:\s*60px/)
    expect(rule).toMatch(/border-radius:\s*26%/)
    expect(rule).toMatch(/grid-area:\s*1 \/ 1/)
    expect(rule).not.toMatch(/position:\s*absolute/)
    expect(markCss).toMatch(/prefers-reduced-motion[\s\S]*\.pulse[\s\S]*animation:\s*none/)
  })
})
